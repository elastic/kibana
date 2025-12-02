/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { runAgentStepDefinition } from './run_agent_step';

/**
 * Register all onechat step definitions with the workflows extensions plugin.
 */
export function registerStepDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  workflowsExtensions.registerStepDefinition(runAgentStepDefinition);
}
