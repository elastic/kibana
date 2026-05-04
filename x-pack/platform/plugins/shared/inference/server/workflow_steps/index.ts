/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { ServerStepDefinition } from '@kbn/workflows/server';
import { aiPromptStepDefinition } from './ai_prompt_step/step';
import { aiSummarizeStepDefinition } from './ai_summarize_step/step';
import { aiClassifyStepDefinition } from './ai_classify_step/step';
import type { InferenceServerStart } from '../types';

/**
 * Creates server step definitions for the AI workflow steps (ai.prompt, ai.summarize, ai.classify).
 * Call this during your plugin's setup phase and register the returned definitions with workflowsExtensions.
 *
 * @param coreSetup - The CoreSetup object from your plugin's setup(), whose start deps include `inference: InferenceServerStart`
 */
export const createAiWorkflowStepDefinitions = <
  TStartDeps extends { inference: InferenceServerStart }
>(
  coreSetup: CoreSetup<TStartDeps>
): ServerStepDefinition[] => {
  return [
    aiPromptStepDefinition(coreSetup),
    aiSummarizeStepDefinition(coreSetup),
    aiClassifyStepDefinition(coreSetup),
  ];
};
