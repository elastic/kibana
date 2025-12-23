/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { getRunAgentStepDefinition } from './run_agent_step';
import type { OnechatInternalService } from '../services/types';

export interface RegisterWorkflowStepsDependencies {
  getInternalService: () => OnechatInternalService;
  getAgentsManagementUrl: () => Promise<string>;
}

export function registerWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup,
  dependencies: RegisterWorkflowStepsDependencies
): void {
  // Register steps
  workflowsExtensions.registerStepDefinition(getRunAgentStepDefinition(dependencies));
}
