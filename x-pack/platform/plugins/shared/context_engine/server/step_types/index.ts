/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { FeedbackAnalysisStepDependencies, KiStepDependencies } from './helpers';
import type { VerifyKi } from './verify_ki';
import { getCreateKiStepDefinition } from './create_ki';
import { getUpdateKiStepDefinition } from './update_ki';
import { getDeleteKiStepDefinition } from './delete_ki';
import { getFeedbackContextStepDefinition } from './feedback_context';
import { getRecordImprovementsStepDefinition } from './record_improvements';
import { getGetLastRunStepDefinition, type LastRunStepDependencies } from './get_last_run';

/** Registers the KI, feedback analysis and automation workflow steps. */
export const registerStepDefinitions = ({
  workflowsExtensions,
  feedbackAnalysis,
  lastRunSteps,
  verifyKi,
  ...deps
}: KiStepDependencies & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  feedbackAnalysis: FeedbackAnalysisStepDependencies;
  lastRunSteps: LastRunStepDependencies;
  verifyKi: VerifyKi;
}): void => {
  workflowsExtensions.registerStepDefinition(getCreateKiStepDefinition({ ...deps, verifyKi }));
  workflowsExtensions.registerStepDefinition(getUpdateKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getDeleteKiStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(getFeedbackContextStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getRecordImprovementsStepDefinition(feedbackAnalysis));
  workflowsExtensions.registerStepDefinition(getGetLastRunStepDefinition(lastRunSteps));
};
