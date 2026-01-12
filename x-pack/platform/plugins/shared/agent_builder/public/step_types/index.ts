/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { runAgentStepDefinition } from './run_agent_step';

export function registerWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  // Register steps
  workflowsExtensions.registerStepDefinition(runAgentStepDefinition);
}
