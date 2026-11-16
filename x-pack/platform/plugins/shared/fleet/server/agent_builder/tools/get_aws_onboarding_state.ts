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
import type { WorkflowExecutionDto } from '@kbn/workflows';

import {
  AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  type AwsOnboardingCredentialsAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_credentials_attachment';
import type { AwsOnboardingCredentialsOutput } from '../../../common/workflows/steps/credentials';
import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingResolveOutput } from '../../../common/workflows/steps/resolve';
import type { AwsOnboardingCreateStackOutput } from '../../../common/workflows/steps/create_stack';
import type { AwsOnboardingStackStatusOutput } from '../../../common/workflows/steps/stack_status';
import type { AwsOnboardingCreatePoliciesOutput } from '../../../common/workflows/steps/create_policies';
import type { AwsOnboardingHasDataOutput } from '../../../common/workflows/steps/has_data';

import { appContextService } from '../../services/app_context';

import { checkOnboardingAccess, getOnboardingExecution } from './common';
import type { AwsOnboardingToolDeps } from './common';

const stateSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().describe('Execution id returned by start_aws_onboarding.'),
  })
);

/** Output of the last execution of a step, which differs from the first inside loops. */
const lastOutput = <T>(execution: WorkflowExecutionDto, stepId: string): T | undefined => {
  const runs = execution.stepExecutions.filter((s) => s.stepId === stepId && s.output != null);
  if (runs.length === 0) {
    return undefined;
  }
  const last = runs.reduce((a, b) => (b.globalExecutionIndex > a.globalExecutionIndex ? b : a));
  return last.output as T;
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
  const next = deriveCardState(credentialsOutput);
  if (next.status !== stored.status || next.error !== stored.error) {
    // Replace the derived fields wholesale so a stale account_id or error does not linger.
    const { account_id: _a, error: _e, ...base } = stored;
    await attachments.update(existing.id, { data: { ...base, ...next } });
  }
  return existing.id;
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
  handler: async ({ execution_id: executionId }, { request, spaceId, attachments }) => {
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

    const waitingStep = execution.stepExecutions.find(
      (s) => s.status === ExecutionStatus.WAITING_FOR_INPUT
    );
    const discover = lastOutput<AwsOnboardingDiscoverOutput>(execution, 'discover');
    const resolve = lastOutput<AwsOnboardingResolveOutput>(execution, 'resolve');
    const createStack = lastOutput<AwsOnboardingCreateStackOutput>(execution, 'create_stack');
    const stack = lastOutput<AwsOnboardingStackStatusOutput>(execution, 'stack_status');
    const policies = lastOutput<AwsOnboardingCreatePoliciesOutput>(execution, 'create_policies');
    const hasData = lastOutput<AwsOnboardingHasDataOutput>(execution, 'has_data');
    const credentialsOutput =
      lastOutput<AwsOnboardingCredentialsOutput>(execution, 'credentials_recheck') ??
      lastOutput<AwsOnboardingCredentialsOutput>(execution, 'credentials');
    let cardId: string | undefined;
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
          ...(cardId && { credentials_card_attachment_id: cardId }),
          ...(discover && { region: discover.region, discovered_services: discover.services }),
          ...(resolve && {
            resolved: {
              policies: resolve.policies.map(({ service, name }) => ({ service, name })),
              integrations: resolve.integrations,
              permissions_summary: resolve.permissions_summary,
              suggested_identity_name: resolve.suggested_identity_name,
            },
          }),
          ...((createStack || stack) && {
            stack: {
              stack_id: createStack?.stack_id,
              status: stack?.status,
              reason: stack?.reason,
            },
          }),
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
