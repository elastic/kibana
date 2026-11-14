/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ExecutionStatus } from '@kbn/workflows';

import { checkOnboardingAccess, getOnboardingExecution } from './common';
import type { AwsOnboardingToolDeps } from './common';

const answerSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().describe('Execution id returned by start_aws_onboarding.'),
    step_name: z
      .string()
      .describe(
        'The waiting.step_name returned by get_aws_onboarding_state for the step you are answering.'
      ),
    answer: z
      .record(z.string(), z.unknown())
      .describe(
        'The user answer for the waiting step. For an approval step use { "approved": true } or { "approved": false }. For an input step use the properties of the step schema.'
      ),
  })
);

export const createAnswerAwsOnboardingTool = ({
  workflowApi,
}: AwsOnboardingToolDeps): BuiltinSkillBoundedTool<typeof answerSchema> => ({
  id: 'answer_aws_onboarding',
  type: ToolType.builtin,
  description:
    'Resume a paused AWS onboarding run with the answer the user gave to the waiting step. Call it only after the user has explicitly replied, never on their behalf.',
  schema: answerSchema,
  confirmation: { askUser: 'never' },
  handler: async (
    { execution_id: executionId, step_name: stepName, answer },
    { request, spaceId }
  ) => {
    const denied = await checkOnboardingAccess(request, 'write');
    if (denied) {
      return { results: [denied] };
    }

    const found = await getOnboardingExecution({ workflowApi, executionId, spaceId, request });
    if ('error' in found) {
      return { results: [found.error] };
    }

    // Answer only the step the user was asked about: a retried approval must never approve the
    // next waiting step, such as the stack creation that follows the settings approval.
    const waitingStep = found.execution.stepExecutions.find(
      (step) => step.status === ExecutionStatus.WAITING_FOR_INPUT
    );
    if (!waitingStep) {
      return { results: [errorResult('The AWS onboarding run is not waiting for an answer.')] };
    }
    if (waitingStep.stepId !== stepName) {
      return {
        results: [
          errorResult(
            `The run is waiting on step '${waitingStep.stepId}', not '${stepName}'. Call get_aws_onboarding_state, relay the new question to the user and answer only after they reply.`
          ),
        ],
      };
    }

    try {
      await workflowApi.resumeWorkflowExecution(executionId, spaceId, answer, request, {
        stepExecutionId: waitingStep.id,
      });
    } catch (e) {
      return {
        results: [
          errorResult(`Failed to resume AWS onboarding: ${e instanceof Error ? e.message : e}`),
        ],
      };
    }

    const after = await getOnboardingExecution({ workflowApi, executionId, spaceId, request });
    return {
      results: ['error' in after ? after.error : otherResult({ status: after.execution.status })],
    };
  },
});
