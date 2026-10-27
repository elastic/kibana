/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type {
  AiIndexStepDependencies,
  FeedbackAnalysisStepDependencies,
  KiStepDependencies,
} from './helpers';
import type { VerifyKi } from './verify_ki';
import { getCreateKiStepDefinition } from './create_ki';
import { getUpdateKiStepDefinition } from './update_ki';
import { getDeleteKiStepDefinition } from './delete_ki';
import { getFeedbackContextStepDefinition } from './feedback_context';
import { getRecordImprovementsStepDefinition } from './record_improvements';
import { getGetAiIndexStepDefinition } from './get_ai_index';
import { getQueryAiIndexStepDefinition } from './query_ai_index';
import { getPurgeKisStepDefinition } from './purge_kis';

/** Registers the KI, AI index and feedback analysis workflow steps. */
export const registerStepDefinitions = ({
  workflowsExtensions,
  feedbackAnalysis,
  aiIndexSteps,
  verifyKi,
  ...deps
}: KiStepDependencies & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  feedbackAnalysis: FeedbackAnalysisStepDependencies;
  aiIndexSteps: AiIndexStepDependencies;
  verifyKi: VerifyKi;
}): void => {
  workflowsExtensions.registerStepDefinition(getCreateKiStepDefinition({ ...deps, verifyKi }));
  workflowsExtensions.registerStepDefinition(getUpdateKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getDeleteKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getFeedbackContextStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getRecordImprovementsStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getGetAiIndexStepDefinition(aiIndexSteps));
  workflowsExtensions.registerStepDefinition(getQueryAiIndexStepDefinition(aiIndexSteps));
  workflowsExtensions.registerStepDefinition(getPurgeKisStepDefinition(aiIndexSteps));
};
