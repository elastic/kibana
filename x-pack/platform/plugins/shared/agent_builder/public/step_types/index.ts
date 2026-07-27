/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export function registerWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  core: CoreSetup
): void {
  // Register steps
  workflowsExtensions.registerStepDefinition(() =>
    import('./run_agent_step').then((m) => m.createRunAgentStepDefinition(core))
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./rerank_step').then((m) => m.createRerankStepDefinition(core))
  );
}
