/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ExecutionStatus } from '@kbn/workflows';

import {
  AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  type AwsOnboardingSettingsAttachmentData,
} from '../../../common/agent_builder/aws_onboarding_settings_attachment';
import { validateSettingsAnswer } from '../../../common/workflows/steps/settings';
import type {
  AwsOnboardingSettingsAnswer,
  AwsOnboardingSettingsRequirement,
  SettingsProblem,
} from '../../../common/workflows/steps/settings';
import { getOnboardingExecution } from '../../agent_builder/tools/common';
import type { WorkflowApi } from '../../agent_builder/tools/common';

export interface SubmitSettingsAnswerResult {
  status: 'resumed' | 'invalid';
  problems?: SettingsProblem[];
}

/**
 * The one place that validates an `ask_settings` answer against the requirement the run
 * produced and resumes the run when it is valid. Throws when the run is missing, belongs to
 * another workflow or is not waiting at `ask_settings`.
 */
export const submitSettingsAnswer = async ({
  workflowApi,
  executionId,
  spaceId,
  request,
  answer,
  attachments,
}: {
  workflowApi: WorkflowApi;
  executionId: string;
  spaceId: string;
  request: KibanaRequest;
  answer: AwsOnboardingSettingsAnswer;
  attachments?: AttachmentStateManager;
}): Promise<SubmitSettingsAnswerResult> => {
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
  if (waitingStep?.stepId !== 'ask_settings') {
    throw new Error(
      `The run is not waiting at 'ask_settings' (${
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

  const problems = validateSettingsAnswer(requirement, answer);
  if (problems.length > 0) {
    await recordAttempt({ attachments, executionId, answer, problems });
    return { status: 'invalid', problems };
  }

  await workflowApi.resumeWorkflowExecution(executionId, spaceId, answer, request, {
    stepExecutionId: waitingStep.id,
  });
  return { status: 'resumed' };
};

/** Keeps an invalid attempt on the settings card so it reflects what the user gave in chat. */
const recordAttempt = async ({
  attachments,
  executionId,
  answer,
  problems,
}: {
  attachments?: AttachmentStateManager;
  executionId: string;
  answer: AwsOnboardingSettingsAnswer;
  problems: SettingsProblem[];
}) => {
  if (!attachments) return;
  const card = attachments
    .getActive()
    .find(
      (a) =>
        a.type === AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE &&
        (getLatestVersion(a)?.data as Partial<AwsOnboardingSettingsAttachmentData> | undefined)
          ?.execution_id === executionId
    );
  if (!card) return;
  const stored = getLatestVersion(card)?.data as AwsOnboardingSettingsAttachmentData;
  await attachments.update(card.id, { data: { ...stored, answer, problems } });
};
