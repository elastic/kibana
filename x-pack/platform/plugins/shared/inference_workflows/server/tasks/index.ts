/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import { aiPromptStepDefinition } from '../steps/ai/ai_prompt_step/step';
import { aiSummarizeStepDefinition } from '../steps/ai/ai_summarize_step/step';
import { aiClassifyStepDefinition } from '../steps/ai/ai_classify_step/step';
import { registerInferenceFeatures } from '../steps/ai/register_inference_features';

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
}

interface TasksStartDeps {
  inference: InferenceTasksStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
}

/** The AI workflow steps for a task pod: the same step definitions and inference features. */
class InferenceWorkflowsTasksPlugin implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps> {
  setup(core: CoreTasksSetup<TasksStartDeps>, deps: TasksSetupDeps) {
    // The steps read `inference` and `searchInferenceEndpoints` through `getStartServices`.
    const coreSetup = core as never;
    deps.workflowsExtensions.registerStepDefinition(aiPromptStepDefinition(coreSetup));
    deps.workflowsExtensions.registerStepDefinition(aiSummarizeStepDefinition(coreSetup));
    deps.workflowsExtensions.registerStepDefinition(aiClassifyStepDefinition(coreSetup));

    registerInferenceFeatures(deps.searchInferenceEndpoints);

    return {};
  }

  start() {
    return {};
  }
}

export const plugin = async () => new InferenceWorkflowsTasksPlugin();
