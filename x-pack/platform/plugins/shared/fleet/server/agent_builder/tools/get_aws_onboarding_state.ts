/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { toWorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import {
  AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  type AwsOnboardingCredentialsAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_credentials_attachment';
import {
  AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  type AwsOnboardingRunAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_run_attachment';
import type { AwsOnboardingSettingsRequirement } from '../../../common/workflows/steps/settings';
import type { AwsOnboardingSettingsRequirementOutput } from '../../../common/workflows/steps/settings_requirement';
import type { AwsOnboardingCredentialsOutput } from '../../../common/workflows/steps/credentials';
import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingListIdentitiesOutput } from '../../../common/workflows/steps/list_identities';
import type { AwsOnboardingResolveOutput } from '../../../common/workflows/steps/resolve';
import type { AwsOnboardingCreatePoliciesOutput } from '../../../common/workflows/steps/create_policies';
import type { AwsOnboardingHasDataOutput } from '../../../common/workflows/steps/has_data';

import { appContextService } from '../../services/app_context';
import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
  lastOutput,
  lastStepExecution,
  latestStackRun,
  readAwsOnboardingRunProgress,
} from '../../services/aws_onboarding';

import { checkOnboardingAccess, getOnboardingExecution } from './common';
import type { AwsOnboardingToolDeps } from './common';

const stateSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().describe('Execution id returned by start_aws_onboarding.'),
    service: z
      .string()
      .optional()
      .describe(
        'Catalog id of the service whose settings to return, for example guardduty. Omit for the run state without settings.'
      ),
  })
);

/**
 * The requirement for one service, without the suggested name the result carries at the top
 * level. One service at a time keeps the result small enough for the agent to read in full.
 */
const requirementForService = (
  {
    suggested_identity_name: _suggestedIdentityName,
    ...requirement
  }: AwsOnboardingSettingsRequirementOutput,
  service: AwsOnboardingSettingsRequirement['services'][number]
): AwsOnboardingSettingsRequirement => ({ ...requirement, services: [service] });

/** Only what the agent shows and decides on for each identity: no covered integrations. */
const summarizeIdentity = ({
  id,
  name,
  created_at: createdAt,
  stack_region: stackRegion,
  updatable,
  not_updatable_reason: notUpdatableReason,
  covered_policy_templates: coveredPolicyTemplates,
}: AwsOnboardingListIdentitiesOutput['identities'][number]) => ({
  id,
  name,
  created_at: createdAt,
  ...(stackRegion && { stack_region: stackRegion }),
  updatable,
  ...(notUpdatableReason && { not_updatable_reason: notUpdatableReason }),
  covered_policy_templates: coveredPolicyTemplates,
});

/** An account can bill for well over a hundred services; past this many names only the count is given. */
const MAX_UNMATCHED_NAMES = 60;

/** The discover result the selection pause needs: matched services and the unmatched names. */
const summarizeDiscovery = ({ services }: AwsOnboardingDiscoverOutput) => {
  const unmatched = services.filter(({ matched }) => !matched).map(({ name }) => name);
  return {
    discovered_services: services
      .filter(({ matched }) => matched)
      .map(({ id, name, agentless }) => ({ id, name, agentless })),
    unmatched_services: unmatched.slice(0, MAX_UNMATCHED_NAMES),
    unmatched_count: unmatched.length,
  };
};

const discoveredEntry = (discover: AwsOnboardingDiscoverOutput, service: string) => {
  const entry = discover.services.find(({ id }) => id === service);
  if (!entry) {
    return undefined;
  }
  const { id, name, matched, agentless, detector_ids: detectorIds } = entry;
  return { id, name, matched, agentless, ...(detectorIds && { detector_ids: detectorIds }) };
};

/** The stack the run created or updated, from the shared run progress; none before it starts. */
const readStackBlock = async (execution: WorkflowExecutionDto) => {
  const { action, output } = latestStackRun(execution);
  if (!output) {
    return undefined;
  }
  const { stack } = await readAwsOnboardingRunProgress(execution);
  return {
    action,
    stack_id: stack.stack_id,
    stack_name: stack.stack_name,
    status: stack.phase,
    stack_status: stack.stack_status,
    reason: stack.reason,
    latest_event: stack.resources[stack.resources.length - 1],
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
 * Creates the run card once per execution, as soon as the plan is approved. The card only
 * identifies the run: the browser reads the stack, connector, policies and data progress live.
 */
const syncRunCard = async ({
  attachments,
  executionId,
  execution,
  resolve,
  settingsRequirement,
  credentialsOutput,
}: {
  attachments: AttachmentStateManager;
  executionId: string;
  execution: WorkflowExecutionDto;
  resolve: AwsOnboardingResolveOutput | undefined;
  settingsRequirement: AwsOnboardingSettingsRequirementOutput | undefined;
  credentialsOutput: AwsOnboardingCredentialsOutput | undefined;
}): Promise<string | undefined> => {
  const existing = attachments
    .getActive()
    .find(
      (a) =>
        a.type === AWS_ONBOARDING_RUN_ATTACHMENT_TYPE &&
        (getLatestVersion(a)?.data as Partial<AwsOnboardingRunAttachmentData> | undefined)
          ?.execution_id === executionId
    );
  if (existing) {
    return existing.id;
  }

  const approval = lastStepExecution(execution, 'approve_plan');
  const approved =
    (approval?.output as { response?: { approved?: boolean } } | undefined)?.response?.approved ===
    true;
  const region = credentialsOutput?.region;
  if (!approval || !approved || !resolve || !region) {
    return undefined;
  }
  const serviceNames = new Map(
    (settingsRequirement?.services ?? []).map(({ id, name }) => [id, name])
  );
  const data: AwsOnboardingRunAttachmentData = {
    execution_id: executionId,
    // getOnboardingExecution only returns executions of this workflow.
    workflow_id: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
    region,
    for_services: resolve.policies.map(({ service }) => serviceNames.get(service) ?? service),
    stack_action: resolve.stack_action,
    ...(resolve.stack_action === 'update' && { adding: resolve.added_policy_templates }),
    started_at: approval.finishedAt ?? execution.startedAt,
  };
  const created = await attachments.add({
    type: AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
    data,
    description: 'AWS onboarding run progress',
  });
  return created.id;
};

export const createGetAwsOnboardingStateTool = ({
  workflowApi,
}: AwsOnboardingToolDeps): BuiltinSkillBoundedTool<typeof stateSchema> => ({
  id: 'get_aws_onboarding_state',
  type: ToolType.builtin,
  description:
    'Get the progress of an AWS onboarding run: its status, the step it is waiting on (with the message to relay and the answer schema), and the outputs of the steps completed so far.',
  schema: stateSchema,
  confirmation: { askUser: 'never' },
  handler: async (
    { execution_id: executionId, service: serviceId },
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
    const { execution } = found;

    const state = toWorkflowExecutionState(execution, executionId);
    if (execution.status === ExecutionStatus.COMPLETED) {
      return { results: [otherResult({ status: execution.status, output: state.output })] };
    }

    const stack = await readStackBlock(execution);
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
    const requirementService =
      serviceId !== undefined && settingsRequirement
        ? settingsRequirement.services.find(({ id }) => id === serviceId)
        : undefined;
    if (serviceId !== undefined && !settingsRequirement) {
      return {
        results: [errorResult('The settings are not ready yet; call again without service.')],
      };
    }
    if (serviceId !== undefined && settingsRequirement && !requirementService) {
      const validIds = settingsRequirement.services.map(({ id }) => id).join(', ');
      return {
        results: [
          errorResult(
            `The service '${serviceId}' is not in this run's settings. Valid ids: ${validIds}.`
          ),
        ],
      };
    }
    const discoveredService =
      serviceId !== undefined && discover ? discoveredEntry(discover, serviceId) : undefined;
    let cardId: string | undefined;
    let runCardId: string | undefined;
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
      try {
        runCardId = await syncRunCard({
          attachments,
          executionId,
          execution,
          resolve,
          settingsRequirement,
          credentialsOutput,
        });
      } catch (e) {
        appContextService
          .getLogger()
          .warn(`Could not create the AWS onboarding run card: ${e.message}`);
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
          // A requirement is returned for one asked-for service only; the service list and the
          // suggested name stay available for every later pause.
          ...(settingsRequirement && {
            settings_services: settingsRequirement.services.map(({ id, name }) => ({ id, name })),
            suggested_identity_name: settingsRequirement.suggested_identity_name,
          }),
          ...(settingsRequirement &&
            requirementService && {
              settings_requirement: requirementForService(settingsRequirement, requirementService),
            }),
          ...(discoveredService && { discovered_service: discoveredService }),
          ...(discover && { region: discover.region }),
          ...(discover &&
            waitingStep?.stepId === 'select_services' &&
            summarizeDiscovery(discover)),
          ...(listIdentities && { identities: listIdentities.identities.map(summarizeIdentity) }),
          ...(resolve && {
            resolved: {
              policies: resolve.policies.map(({ service, name }) => ({ service, name })),
              permissions_summary: resolve.permissions_summary,
              identity_name: resolve.identity_name,
              stack_action: resolve.stack_action,
              stack_id: resolve.stack_id,
              cloud_connector_id: resolve.cloud_connector_id,
              added_policy_templates: resolve.added_policy_templates,
            },
          }),
          ...(stack && { stack }),
          ...(runCardId && { run_card_attachment_id: runCardId }),
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
