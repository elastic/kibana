/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

export interface InferenceWorkflowsSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface InferenceWorkflowsStartDeps {
  inference: InferenceServerStart;
}
