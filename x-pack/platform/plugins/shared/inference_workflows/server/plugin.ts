/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { InferenceWorkflowsSetupDeps, InferenceWorkflowsStartDeps } from './types';
import { aiPromptStepDefinition } from './steps/ai/ai_prompt_step/step';
import { aiSummarizeStepDefinition } from './steps/ai/ai_summarize_step/step';
import { aiClassifyStepDefinition } from './steps/ai/ai_classify_step/step';
import { registerInferenceFeatures } from './steps/ai/register_inference_features';

export class InferenceWorkflowsPlugin
  implements Plugin<{}, {}, InferenceWorkflowsSetupDeps, InferenceWorkflowsStartDeps>
{
  setup(core: CoreSetup<InferenceWorkflowsStartDeps>, deps: InferenceWorkflowsSetupDeps) {
    deps.workflowsExtensions.registerStepDefinition(aiPromptStepDefinition(core));
    deps.workflowsExtensions.registerStepDefinition(aiSummarizeStepDefinition(core));
    deps.workflowsExtensions.registerStepDefinition(aiClassifyStepDefinition(core));

    if (deps.searchInferenceEndpoints) {
      registerInferenceFeatures(deps.searchInferenceEndpoints);
    }

    return {};
  }

  start(_core: CoreStart) {
    return {};
  }
}
