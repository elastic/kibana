/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

export interface InferenceWorkflowsServerSetupDeps {
  inference: InferenceServerSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface InferenceWorkflowsServerStartDeps {
  inference: InferenceServerStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InferenceWorkflowsServerSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InferenceWorkflowsServerStart {}
