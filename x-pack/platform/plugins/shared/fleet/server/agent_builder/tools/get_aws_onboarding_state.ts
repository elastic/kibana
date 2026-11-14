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
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';

import type { AwsOnboardingDiscoverOutput } from '../../../common/workflows/steps/discover';
import type { AwsOnboardingResolveOutput } from '../../../common/workflows/steps/resolve';
import type { AwsOnboardingCreateStackOutput } from '../../../common/workflows/steps/create_stack';
import type { AwsOnboardingStackStatusOutput } from '../../../common/workflows/steps/stack_status';
import type { AwsOnboardingCreatePoliciesOutput } from '../../../common/workflows/steps/create_policies';
import type { AwsOnboardingHasDataOutput } from '../../../common/workflows/steps/has_data';

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

export const createGetAwsOnboardingStateTool = ({
  workflowApi,
}: AwsOnboardingToolDeps): BuiltinSkillBoundedTool<typeof stateSchema> => ({
  id: 'get_aws_onboarding_state',
  type: ToolType.builtin,
  description:
    'Get the progress of an AWS onboarding run: its status, the step it is waiting on (with the message to relay and the answer schema), and the outputs of the steps completed so far.',
  schema: stateSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ execution_id: executionId }, { request, spaceId }) => {
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
