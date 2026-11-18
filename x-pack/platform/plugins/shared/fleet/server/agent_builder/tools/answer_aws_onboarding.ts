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
import { toWorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';

import { awsOnboardingPlanAnswerSchema } from '../../../common/workflows/steps/settings';
import { submitPlanAnswer } from '../../services/aws_onboarding/settings_answer';

import { checkOnboardingAccess, getOnboardingExecution, sleep } from './common';
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

const DEFAULT_SETTLE_INTERVAL_MS = 1000;
const DEFAULT_SETTLE_TIMEOUT_MS = 15000;

export const createAnswerAwsOnboardingTool = ({
  workflowApi,
  settleIntervalMs = DEFAULT_SETTLE_INTERVAL_MS,
  settleTimeoutMs = DEFAULT_SETTLE_TIMEOUT_MS,
}: AwsOnboardingToolDeps & {
  settleIntervalMs?: number;
  settleTimeoutMs?: number;
}): BuiltinSkillBoundedTool<typeof answerSchema> => ({
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

    // Answer only the step the user was asked about: a retried answer must never answer the next
    // waiting step, such as the plan approval that follows the plan input.
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
      if (stepName === 'ask_plan') {
        // Validation and resume live in one service.
        const parsed = awsOnboardingPlanAnswerSchema.safeParse(answer);
        if (!parsed.success) {
          return {
            results: [errorResult(`The plan answer is malformed: ${parsed.error.message}`)],
          };
        }
        const submitted = await submitPlanAnswer({
          workflowApi,
          executionId,
          spaceId,
          request,
          answer: parsed.data,
        });
        if (submitted.status === 'invalid') {
          return {
            results: [otherResult({ status: 'invalid', problems: submitted.problems })],
          };
        }
      } else {
        await workflowApi.resumeWorkflowExecution(executionId, spaceId, answer, request, {
          stepExecutionId: waitingStep.id,
        });
      }
    } catch (e) {
      return {
        results: [
          errorResult(`Failed to resume AWS onboarding: ${e instanceof Error ? e.message : e}`),
        ],
      };
    }

    // The resume call returns before the engine has processed it, so wait until the answered step
    // has left the waiting state; otherwise the next state read would still show the old pause.
    const hasSettled = (execution: WorkflowExecutionDto) =>
      execution.status !== ExecutionStatus.WAITING_FOR_INPUT ||
      execution.stepExecutions.find((step) => step.id === waitingStep.id)?.status !==
        ExecutionStatus.WAITING_FOR_INPUT;

    const deadline = Date.now() + settleTimeoutMs;
    let after = await getOnboardingExecution({ workflowApi, executionId, spaceId, request });
    while ('execution' in after && !hasSettled(after.execution) && Date.now() < deadline) {
      await sleep(settleIntervalMs);
      after = await getOnboardingExecution({ workflowApi, executionId, spaceId, request });
    }
    if ('error' in after) {
      return { results: [after.error] };
    }

    const { execution } = after;
    const nextWaiting = execution.stepExecutions.find(
      (step) => step.status === ExecutionStatus.WAITING_FOR_INPUT
    );
    const { waiting_input: waitingInput } = toWorkflowExecutionState(execution, executionId);
    return {
      results: [
        otherResult({
          status: execution.status,
          ...(nextWaiting &&
            waitingInput && {
              waiting: {
                step_name: nextWaiting.stepId,
                message: waitingInput.message,
                schema: waitingInput.schema,
              },
            }),
          ...(!hasSettled(execution) && { settling: true }),
        }),
      ],
    };
  },
});
