/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { InternalSetupServices, InternalStartServices } from '../../services/types';
import { runSmlMemoryRecall } from './run_sml_memory_recall';

export interface RegisterSmlMemoryRecallHookDeps {
  coreSetup: CoreSetup;
  logger: Logger;
  getInternalServices: () => InternalStartServices;
}

/**
 * Registers the before-agent hook that searches SML for memories relevant to
 * the current user message and prepends them to the round input.
 *
 * Runs at priority 5 (after the workflows hook at default 0, so memories are
 * injected after any workflow-driven prompt transformations).
 */
export const registerSmlMemoryRecallHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterSmlMemoryRecallHookDeps
): void => {
  const logger = deps.logger.get('smlMemoryRecall');

  serviceSetups.hooks.register({
    id: 'sml-memory-recall',
    priority: 5,
    hooks: {
      [HookLifecycle.beforeAgent]: {
        mode: HookExecutionMode.blocking,
        timeout: 10_000,
        handler: (context) =>
          runSmlMemoryRecall({
            context,
            coreSetup: deps.coreSetup,
            logger,
            getInternalServices: deps.getInternalServices,
          }),
      },
    },
  });
};
