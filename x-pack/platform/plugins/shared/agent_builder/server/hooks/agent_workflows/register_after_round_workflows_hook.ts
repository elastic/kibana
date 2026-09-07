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
import { runAfterRoundWorkflows } from './run_after_round_workflows';

export interface RegisterAfterRoundWorkflowsHookDeps {
  workflowsManagement?: WorkflowsServerPluginSetup;
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers the after-round hook that runs the agent's configured post-round workflows
 * as a fire-and-forget side effect after each conversation round completes. When workflows
 * management is not available, registration is skipped.
 */
export function registerAfterRoundWorkflowsHook(
  serviceSetups: InternalSetupServices,
  deps: RegisterAfterRoundWorkflowsHookDeps
): void {
  if (!deps.workflowsManagement) {
    deps.logger.debug('After-round workflows hook skipped: workflows management not available');
    return;
  }

  const workflowApi = deps.workflowsManagement.management;
  const logger = deps.logger.get('afterRoundWorkflows');

  serviceSetups.hooks.register({
    id: 'after-round-workflows',
    hooks: {
      [HookLifecycle.afterRound]: {
        mode: HookExecutionMode.nonBlocking,
        handler: (context) =>
          runAfterRoundWorkflows({
            context,
            workflowApi,
            getInternalServices: deps.getInternalServices,
            logger,
          }),
      },
    },
  });
}
