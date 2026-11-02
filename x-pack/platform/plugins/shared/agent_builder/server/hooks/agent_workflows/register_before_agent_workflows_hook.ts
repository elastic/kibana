/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { runBeforeAgentWorkflows } from './run_before_agent_workflows';

export interface RegisterBeforeAgentWorkflowsHookDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers the before-agent hook that runs the agent's configured workflows
 * in sequence before each conversation round. When workflows management is
 * not available, registration is skipped.
 */
export function registerBeforeAgentWorkflowsHook(
  serviceSetups: InternalSetupServices,
  deps: RegisterBeforeAgentWorkflowsHookDeps
): void {
  if (!deps.workflowsManagement) {
    deps.logger.debug('Before-agent workflows hook skipped: workflows management not available');
    return;
  }

  const workflowApi = deps.workflowsManagement.management;
  const logger = deps.logger.get('beforeAgentWorkflows');

  serviceSetups.hooks.register({
    id: 'before-agent-workflows',
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        handler: async (context) =>
          runBeforeAgentWorkflows({
            context,
            workflowApi,
            getInternalServices: deps.getInternalServices,
            logger,
          }),
      },
    },
  });
}
