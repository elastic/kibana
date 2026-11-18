/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { toWorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';

import {
  AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  type AwsOnboardingCredentialsAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_credentials_attachment';
import {
  AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  type AwsOnboardingStackAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_stack_attachment';
import { parseAwsRegionFromArn } from '../../../common/services/cloud_connectors/iac_deployment';
import type { AwsOnboardingSettingsRequirement } from '../../../common/workflows/steps/settings';
import type { AwsOnboardingSettingsRequirementOutput } from '../../../common/workflows/steps/settings_requirement';
import type { AwsOnboardingCredentialsOutput } from '../../../common/workflows/steps/credentials';
import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingListIdentitiesOutput } from '../../../common/workflows/steps/list_identities';
import type { AwsOnboardingResolveOutput } from '../../../common/workflows/steps/resolve';
import type { AwsOnboardingCreateStackOutput } from '../../../common/workflows/steps/create_stack';
import type { AwsOnboardingStackStatusOutput } from '../../../common/workflows/steps/stack_status';
import type { AwsOnboardingUpdateStackOutput } from '../../../common/workflows/steps/update_stack';
import type { AwsOnboardingCreatePoliciesOutput } from '../../../common/workflows/steps/create_policies';
import type { AwsOnboardingHasDataOutput } from '../../../common/workflows/steps/has_data';

import { appContextService } from '../../services/app_context';
import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
  awsOnboardingStackService,
} from '../../services/aws_onboarding';

import { checkOnboardingAccess, getOnboardingExecution, sleep } from './common';
import type { AwsOnboardingToolDeps } from './common';

const stateSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().describe('Execution id returned by start_aws_onboarding.'),
    wait_for_change_since: z
      .string()
      .optional()
      .describe(
        'Pass "" once, right after the plan approval, to wait until the stack has started. The tool waits while stack.progress_key ("" before there is a stack) equals this value, and returns when it changes, when the run pauses or ends, or after 15 seconds.'
      ),
  })
);

const DEFAULT_WAIT_INTERVAL_MS = 1000;
const DEFAULT_WAIT_TIMEOUT_MS = 15000;
/** After this long without the stack finishing, the agent stops narrating and hands over. */
const STACK_HAND_OVER_MS = 300_000;

interface StackProgress {
  stack?: {
    /** Whether the run is creating a new identity's stack or updating a reused one's. */
    action: 'create' | 'update';
    stack_id?: string;
    status?: AwsOnboardingStackStatusOutput['status'];
    stack_status?: string;
    reason?: string;
    latest_event?: AwsOnboardingStackStatusOutput['latest_event'];
    progress_key: string;
    hand_over?: true;
  };
  progressKey?: string;
}

/**
 * The run is still moving: running a step, or in the engine's timer wait between stack polls.
 * A pause for the user is `WAITING_FOR_INPUT` and does not count.
 */
const isActive = (execution: WorkflowExecutionDto): boolean =>
  execution.status === ExecutionStatus.RUNNING || execution.status === ExecutionStatus.WAITING;

/** The requirement without the suggested name, which the result carries at the top level. */
const requirementWithoutSuggestion = ({
  suggested_identity_name: _suggestedIdentityName,
  ...requirement
}: AwsOnboardingSettingsRequirementOutput): AwsOnboardingSettingsRequirement => requirement;

/** The last execution of a step with an output, which differs from the first inside loops. */
const lastStepExecution = (
  execution: WorkflowExecutionDto,
  stepId: string
): WorkflowStepExecutionDto | undefined => {
  const runs = execution.stepExecutions.filter((s) => s.stepId === stepId && s.output != null);
  if (runs.length === 0) {
    return undefined;
  }
  return runs.reduce((a, b) => (b.globalExecutionIndex > a.globalExecutionIndex ? b : a));
};

const lastOutput = <T>(execution: WorkflowExecutionDto, stepId: string): T | undefined =>
  lastStepExecution(execution, stepId)?.output as T | undefined;

/** A run creates a new identity's stack or updates a reused one's; the newer step decides. */
const latestStackRun = (
  execution: WorkflowExecutionDto
): {
  action: 'create' | 'update';
  run?: WorkflowStepExecutionDto;
  output?: AwsOnboardingCreateStackOutput | AwsOnboardingUpdateStackOutput;
} => {
  const createStackRun = lastStepExecution(execution, 'create_stack');
  const updateStackRun = lastStepExecution(execution, 'update_stack');
  const action =
    updateStackRun &&
    (!createStackRun || updateStackRun.globalExecutionIndex > createStackRun.globalExecutionIndex)
      ? 'update'
      : 'create';
  const run = action === 'update' ? updateStackRun : createStackRun;
  return {
    action,
    run,
    output: run?.output as AwsOnboardingCreateStackOutput | AwsOnboardingUpdateStackOutput,
  };
};

/**
 * Reads the stack block of the result for one handler call. While the run is active the stack is
 * read live, because the engine output is only as fresh as its last poll; otherwise the engine
 * output is used. One provisioning session serves every live read of the call.
 */
const createStackProgressReader = (handOverMs: number) => {
  let client: ReturnType<typeof awsOnboardingStackService.createStatusClient> | undefined;
  let warned = false;

  return async (
    execution: WorkflowExecutionDto,
    previous?: StackProgress
  ): Promise<StackProgress> => {
    const { action, run: stackRun, output: stackOutput } = latestStackRun(execution);
    let current = lastOutput<AwsOnboardingStackStatusOutput>(
      execution,
      action === 'update' ? 'stack_status_update' : 'stack_status'
    );

    if (isActive(execution) && stackOutput?.stack_id) {
      try {
        client ??= awsOnboardingStackService.createStatusClient();
        const live = await awsOnboardingStackService.statusWith(await client, stackOutput.stack_id);
        current = {
          status: live.status,
          stack_status: live.stackStatus,
          reason: live.reason,
          latest_event: live.latestEvent,
        };
      } catch (e) {
        if (!warned) {
          warned = true;
          appContextService
            .getLogger()
            .warn(`Could not read the AWS onboarding stack live: ${e.message}`);
        }
        // Mid-wait, the engine output is older than the last live read: keep the key steady.
        if (previous?.stack) {
          return previous;
        }
      }
    }

    if (!stackOutput && !current) {
      return {};
    }
    const progressKey = `${current?.stack_status ?? ''}|${current?.latest_event?.resource ?? ''}:${
      current?.latest_event?.status ?? ''
    }`;
    const startedAt = stackRun?.finishedAt ? Date.parse(stackRun.finishedAt) : NaN;
    const handOver = current?.status === 'in_progress' && Date.now() - startedAt > handOverMs;
    return {
      progressKey,
      stack: {
        action,
        stack_id: stackOutput?.stack_id,
        status: current?.status,
        stack_status: current?.stack_status,
        reason: current?.reason,
        latest_event: current?.latest_event,
        progress_key: progressKey,
        ...(handOver && { hand_over: true as const }),
      },
    };
  };
};

const deriveCardState = (
  output: AwsOnboardingCredentialsOutput | undefined
): Pick<AwsOnboardingCredentialsAttachmentData, 'status' | 'account_id' | 'error'> => {
  if (!output?.configured) {
    return { status: 'pending' };
  }
  const accountId = output.account_id ? { account_id: output.account_id } : {};
  if (output.error) {
    return { status: 'verify_failed', error: output.error, ...accountId };
  }
  if (output.discovery_ok === true && output.provisioning_ok !== false) {
    return { status: 'verified', ...accountId };
  }
  return { status: 'configured', ...accountId };
};

/**
 * While the run waits for credentials no step output can change, so the stored card status is
 * read from the live credentials state, mirroring what the credentials step derives.
 */
const deriveLiveCardState = async (): Promise<
  Pick<AwsOnboardingCredentialsAttachmentData, 'status' | 'account_id' | 'error'>
> => {
  const { configured } = await awsOnboardingCredentialsService.getPublic();
  if (!configured) {
    return { status: 'pending' };
  }
  try {
    const { accountId, discovery, provisioning } = await awsOnboardingDiscoveryService.verify();
    const failures = [
      discovery.ok ? undefined : `discovery: ${discovery.error ?? 'failed'}`,
      provisioning && !provisioning.ok
        ? `provisioning: ${provisioning.error ?? 'failed'}`
        : undefined,
    ].filter((failure): failure is string => failure !== undefined);
    if (failures.length > 0) {
      return { status: 'verify_failed', error: failures.join('; '), account_id: accountId };
    }
    return { status: 'verified', account_id: accountId };
  } catch (error) {
    return {
      status: 'verify_failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Creates the credentials card once per execution (only while the run waits for credentials)
 * and keeps its status in step with the credentials step output. The masked key is never
 * written here because the card reads it live in the browser.
 */
const syncCredentialsCard = async ({
  attachments,
  executionId,
  waitingStepId,
  credentialsOutput,
}: {
  attachments: AttachmentStateManager;
  executionId: string;
  waitingStepId: string | undefined;
  credentialsOutput: AwsOnboardingCredentialsOutput | undefined;
}): Promise<string | undefined> => {
  const existing = attachments
    .getActive()
    .find(
      (a) =>
        a.type === AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE &&
        (getLatestVersion(a)?.data as Partial<AwsOnboardingCredentialsAttachmentData> | undefined)
          ?.execution_id === executionId
    );

  if (!existing) {
    if (waitingStepId !== 'ask_credentials') {
      return undefined;
    }
    const data: AwsOnboardingCredentialsAttachmentData = {
      execution_id: executionId,
      region: 'us-east-1',
      status: 'pending',
    };
    const created = await attachments.add({
      type: AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
      data,
      description: 'AWS onboarding access setup for this run',
    });
    return created.id;
  }

  const stored = getLatestVersion(existing)?.data as AwsOnboardingCredentialsAttachmentData;
  const next =
    waitingStepId === 'ask_credentials'
      ? await deriveLiveCardState()
      : deriveCardState(credentialsOutput);
  if (next.status !== stored.status || next.error !== stored.error) {
    // Replace the derived fields wholesale so a stale account_id or error does not linger.
    const { account_id: _a, error: _e, ...base } = stored;
    await attachments.update(existing.id, { data: { ...base, ...next } });
  }
  return existing.id;
};

/**
 * Creates the stack card once per execution, as soon as the run has started its stack. The card
 * only identifies the stack: the browser reads the status, resources and role ARN live.
 */
const syncStackCard = async ({
  attachments,
  executionId,
  execution,
  resolve,
  settingsRequirement,
}: {
  attachments: AttachmentStateManager;
  executionId: string;
  execution: WorkflowExecutionDto;
  resolve: AwsOnboardingResolveOutput | undefined;
  settingsRequirement: AwsOnboardingSettingsRequirementOutput | undefined;
}): Promise<string | undefined> => {
  const existing = attachments
    .getActive()
    .find(
      (a) =>
        a.type === AWS_ONBOARDING_STACK_ATTACHMENT_TYPE &&
        (getLatestVersion(a)?.data as Partial<AwsOnboardingStackAttachmentData> | undefined)
          ?.execution_id === executionId
    );
  if (existing) {
    return existing.id;
  }

  const { action, run, output } = latestStackRun(execution);
  const region = parseAwsRegionFromArn(output?.stack_id);
  if (!run || !output?.stack_id || !region) {
    return undefined;
  }
  const serviceNames = new Map(
    (settingsRequirement?.services ?? []).map(({ id, name }) => [id, name])
  );
  const data: AwsOnboardingStackAttachmentData = {
    execution_id: executionId,
    stack_id: output.stack_id,
    stack_name: output.stack_name,
    region,
    action,
    for_services: (resolve?.policies ?? []).map(
      ({ service }) => serviceNames.get(service) ?? service
    ),
    ...(action === 'update' && resolve && { adding: resolve.added_policy_templates }),
    started_at: run.finishedAt ?? execution.startedAt,
  };
  const created = await attachments.add({
    type: AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
    data,
    description: 'Federated Identity stack progress for this run',
  });
  return created.id;
};

export const createGetAwsOnboardingStateTool = ({
  workflowApi,
  waitIntervalMs = DEFAULT_WAIT_INTERVAL_MS,
  waitTimeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  stackHandOverMs = STACK_HAND_OVER_MS,
}: AwsOnboardingToolDeps & {
  waitIntervalMs?: number;
  waitTimeoutMs?: number;
  stackHandOverMs?: number;
}): BuiltinSkillBoundedTool<typeof stateSchema> => ({
  id: 'get_aws_onboarding_state',
  type: ToolType.builtin,
  description:
    'Get the progress of an AWS onboarding run: its status, the step it is waiting on (with the message to relay and the answer schema), and the outputs of the steps completed so far. Right after the plan approval, call it once with wait_for_change_since "" so the result shows the started stack; never call it in a loop to follow the stack.',
  schema: stateSchema,
  confirmation: { askUser: 'never' },
  handler: async (
    { execution_id: executionId, wait_for_change_since: waitForChangeSince },
    { request, spaceId, attachments }
  ) => {
    const denied = await checkOnboardingAccess(request, 'read');
    if (denied) {
      return { results: [denied] };
    }

    const found = await getOnboardingExecution({
      workflowApi,
      executionId,
      spaceId,
      request,
      includeOutput: true,
    });
    if ('error' in found) {
      return { results: [found.error] };
    }
    let { execution } = found;
    const readStackProgress = createStackProgressReader(stackHandOverMs);
    let progress = await readStackProgress(execution);

    // Wait for the stack to move on; before the stack exists its key is "". The result below is
    // built from the last execution read, so a pause reached during the wait is relayed in the
    // same result.
    let timedOut = false;
    const isPaused = (e: WorkflowExecutionDto) =>
      e.stepExecutions.some((s) => s.status === ExecutionStatus.WAITING_FOR_INPUT);
    const keyUnchanged = () => (progress.progressKey ?? '') === waitForChangeSince;
    if (waitForChangeSince !== undefined && keyUnchanged()) {
      const deadline = Date.now() + waitTimeoutMs;
      while (
        isActive(execution) &&
        !isPaused(execution) &&
        !progress.stack?.hand_over &&
        keyUnchanged()
      ) {
        if (Date.now() >= deadline) {
          timedOut = true;
          break;
        }
        await sleep(waitIntervalMs);
        const next = await getOnboardingExecution({
          workflowApi,
          executionId,
          spaceId,
          request,
          includeOutput: true,
        });
        if ('error' in next) {
          return { results: [next.error] };
        }
        execution = next.execution;
        progress = await readStackProgress(execution, progress);
      }
    }
    const { stack } = progress;

    const state = toWorkflowExecutionState(execution, executionId);
    if (execution.status === ExecutionStatus.COMPLETED) {
      return { results: [otherResult({ status: execution.status, output: state.output })] };
    }

    const waitingStep = execution.stepExecutions.find(
      (s) => s.status === ExecutionStatus.WAITING_FOR_INPUT
    );
    const discover = lastOutput<AwsOnboardingDiscoverOutput>(execution, 'discover');
    const listIdentities = lastOutput<AwsOnboardingListIdentitiesOutput>(
      execution,
      'list_identities'
    );
    const resolve = lastOutput<AwsOnboardingResolveOutput>(execution, 'resolve');
    const policies = lastOutput<AwsOnboardingCreatePoliciesOutput>(execution, 'create_policies');
    const hasData = lastOutput<AwsOnboardingHasDataOutput>(execution, 'has_data');
    const credentialsOutput =
      lastOutput<AwsOnboardingCredentialsOutput>(execution, 'credentials_recheck') ??
      lastOutput<AwsOnboardingCredentialsOutput>(execution, 'credentials');
    const settingsRequirement = lastOutput<AwsOnboardingSettingsRequirementOutput>(
      execution,
      'settings_requirement'
    );
    let cardId: string | undefined;
    let stackCardId: string | undefined;
    if (attachments) {
      try {
        cardId = await syncCredentialsCard({
          attachments,
          executionId,
          waitingStepId: waitingStep?.stepId,
          credentialsOutput,
        });
      } catch (e) {
        // The card is a UI nicety: never fail the state the agent asked for because of it.
        appContextService
          .getLogger()
          .warn(`Could not sync the AWS onboarding credentials card: ${e.message}`);
      }
      // Settings are settled in the chat, so no settings card is created.
      if (stack?.stack_id) {
        try {
          stackCardId = await syncStackCard({
            attachments,
            executionId,
            execution,
            resolve,
            settingsRequirement,
          });
        } catch (e) {
          appContextService
            .getLogger()
            .warn(`Could not create the AWS onboarding stack card: ${e.message}`);
        }
      }
    }

    return {
      results: [
        otherResult({
          status: execution.status,
          waiting:
            waitingStep && state.waiting_input
              ? {
                  step_name: waitingStep.stepId,
                  message: state.waiting_input.message,
                  schema: state.waiting_input.schema,
                }
              : null,
          // Only the credentials pause renders the card; later pauses must not repeat it.
          ...(cardId &&
            waitingStep?.stepId === 'ask_credentials' && {
              credentials_card_attachment_id: cardId,
            }),
          // The requirement belongs to the plan pause only; the suggested name stays available
          // for every later pause.
          ...(settingsRequirement && {
            suggested_identity_name: settingsRequirement.suggested_identity_name,
          }),
          ...(waitingStep?.stepId === 'ask_plan' &&
            settingsRequirement && {
              settings_requirement: requirementWithoutSuggestion(settingsRequirement),
            }),
          ...(discover && { region: discover.region, discovered_services: discover.services }),
          ...(listIdentities && { identities: listIdentities.identities }),
          ...(resolve && {
            resolved: {
              policies: resolve.policies.map(({ service, name }) => ({ service, name })),
              integrations: resolve.integrations,
              permissions_summary: resolve.permissions_summary,
              identity_name: resolve.identity_name,
              stack_action: resolve.stack_action,
              stack_id: resolve.stack_id,
              cloud_connector_id: resolve.cloud_connector_id,
              added_policy_templates: resolve.added_policy_templates,
            },
          }),
          ...(stack && { stack: { ...stack, ...(timedOut && { timed_out: true as const }) } }),
          ...(stackCardId && { stack_card_attachment_id: stackCardId }),
          ...(policies && { policies: policies.policies }),
          ...(hasData && {
            has_data: hasData.has_data,
            policies_with_data: hasData.policies_with_data,
            policies_without_data: hasData.policies_without_data,
          }),
          ...(state.error_message && { error: state.error_message }),
        }),
      ],
    };
  },
});
