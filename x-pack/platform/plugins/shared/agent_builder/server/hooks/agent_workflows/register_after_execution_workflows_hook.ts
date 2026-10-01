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
import { runAfterExecutionWorkflows } from './run_after_execution_workflows';

export interface RegisterAfterExecutionWorkflowsHookDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers the after-execution hook that runs the agent's configured post-execution workflows
 * as a fire-and-forget side effect after each conversation execution completes. When workflows
 * management is not available, registration is skipped.
 */
export function registerAfterExecutionWorkflowsHook(
  serviceSetups: InternalSetupServices,
  deps: RegisterAfterExecutionWorkflowsHookDeps
): void {
  if (!deps.workflowsManagement) {
    deps.logger.debug('After-execution workflows hook skipped: workflows management not available');
    return;
  }

  const workflowApi = deps.workflowsManagement.management;
  const logger = deps.logger.get('afterExecutionWorkflows');

  serviceSetups.hooks.register({
    id: 'after-execution-workflows',
    hooks: {
      [HookLifecycle.afterExecution]: {
        mode: HookExecutionMode.nonBlocking,
        handler: (context) =>
          runAfterExecutionWorkflows({
            context,
            workflowApi,
            getInternalServices: deps.getInternalServices,
            logger,
          }),
      },
    },
  });
}
