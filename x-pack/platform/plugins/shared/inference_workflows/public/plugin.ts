/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerInferenceWorkflowExtensions } from './workflows';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InferenceWorkflowsPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InferenceWorkflowsPublicStart {}

interface InferenceWorkflowsPublicSetupDeps {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export class InferenceWorkflowsPublicPlugin
  implements
    Plugin<
      InferenceWorkflowsPublicSetup,
      InferenceWorkflowsPublicStart,
      InferenceWorkflowsPublicSetupDeps
    >
{
  constructor(_initializerContext: PluginInitializerContext) {}

  setup(
    _core: CoreSetup,
    plugins: InferenceWorkflowsPublicSetupDeps
  ): InferenceWorkflowsPublicSetup {
    registerInferenceWorkflowExtensions(plugins.workflowsExtensions);
    return {};
  }

  start(_core: CoreStart): InferenceWorkflowsPublicStart {
    return {};
  }
}
