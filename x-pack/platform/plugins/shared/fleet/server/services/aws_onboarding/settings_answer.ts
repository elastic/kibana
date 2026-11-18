/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';

import { validateSettingsAnswer } from '../../../common/workflows/steps/settings';
import type {
  AwsOnboardingPlanAnswer,
  AwsOnboardingSettingsRequirement,
  SettingsProblem,
} from '../../../common/workflows/steps/settings';
import { getOnboardingExecution } from '../../agent_builder/tools/common';
import type { WorkflowApi } from '../../agent_builder/tools/common';

export interface SubmitPlanAnswerResult {
  status: 'resumed' | 'invalid';
  problems?: SettingsProblem[];
}

/**
 * Every policy name must belong to a service in the plan, must not be blank and must not repeat:
 * Fleet rejects a duplicate name only when it creates the policies, after the stack exists.
 */
const validatePolicyNames = ({
  services,
  policy_names: policyNames = {},
}: AwsOnboardingPlanAnswer): SettingsProblem[] => {
  const seen = new Set<string>();
  return Object.entries(policyNames).flatMap(([serviceId, name]) => {
    const path = `policy_names.${serviceId}`;
    if (!Object.hasOwn(services, serviceId)) {
      return [{ path, message: `Unknown service "${serviceId}".` }];
    }
    if (name.trim() === '') {
      return [{ path, message: 'The policy name must not be empty.' }];
    }
    if (seen.has(name)) {
      return [{ path, message: `Duplicate policy name "${name}".` }];
    }
    seen.add(name);
    return [];
  });
};

/**
 * The one place that validates an `ask_plan` answer against the requirement the run produced
 * and resumes the run with the whole plan when it is valid. Throws when the run is missing,
 * belongs to another workflow or is not waiting at `ask_plan`.
 */
export const submitPlanAnswer = async ({
  workflowApi,
  executionId,
  spaceId,
  request,
  answer,
}: {
  workflowApi: WorkflowApi;
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
  answer: AwsOnboardingPlanAnswer;
}): Promise<SubmitPlanAnswerResult> => {
  const found = await getOnboardingExecution({
    workflowApi,
    executionId,
    spaceId,
    request,
    includeOutput: true,
  });
  if ('error' in found) {
    throw new Error(`AWS onboarding execution '${executionId}' was not found.`);
  }
  const { execution } = found;

  const waitingStep = execution.stepExecutions.find(
    (step) => step.status === ExecutionStatus.WAITING_FOR_INPUT
  );
  if (waitingStep?.stepId !== 'ask_plan') {
    throw new Error(
      `The run is not waiting at 'ask_plan' (${
        waitingStep ? `waiting at '${waitingStep.stepId}'` : 'not waiting for input'
      }).`
    );
  }

  const requirementRuns = execution.stepExecutions.filter(
    (step) => step.stepId === 'settings_requirement' && step.output != null
  );
  const requirementStep = requirementRuns.reduce<(typeof requirementRuns)[number] | undefined>(
    (latest, step) =>
      !latest || step.globalExecutionIndex > latest.globalExecutionIndex ? step : latest,
    undefined
  );
  if (!requirementStep) {
    throw new Error('The run has no settings requirement to validate against.');
  }
  const requirement = requirementStep.output as AwsOnboardingSettingsRequirement;

  const problems = [
    ...validateSettingsAnswer(requirement, { services: answer.services }),
    ...validatePolicyNames(answer),
  ];
  if (problems.length > 0) {
    return { status: 'invalid', problems };
  }

  await workflowApi.resumeWorkflowExecution(executionId, spaceId, answer, request, {
    stepExecutionId: waitingStep.id,
  });
  return { status: 'resumed' };
};
