/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installWorkflows } from './install_workflows';
import { installInvestigationWorkflow } from '../../../memory_and_investigation/lib/investigation/install_investigation_workflow';

export interface ManagedWorkflowsInstaller {
  /**
   * Installs the full current managed-workflow set (base workflows, plus the memory and
   * investigation workflows when their flags are enabled) and closes the reconciliation window
   * exactly once. Resolves when this install completes and rejects if it fails.
   */
  install: () => Promise<void>;
}

export interface CreateManagedWorkflowsInstallerOptions {
  getClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  isAvailable: () => Promise<boolean>;
  isMemoryEnabled: () => Promise<boolean>;
  isInvestigationEnabled: () => Promise<boolean>;
  logger: Logger;
}

/**
 * Creates the single owner of significant events managed-workflow installation.
 *
 * `install()` is the only place that calls `client.ready()`, and every install writes the full
 * current workflow set before doing so. Calls are serialized through a promise chain, so a runtime
 * flag flip can never close the reconciliation window with a partial set — which would make the
 * platform prune the owner's other workflows as orphans. `ready()` runs only once per process
 * (further installs are idempotent upserts that don't need to reconcile again).
 */
export const createManagedWorkflowsInstaller = ({
  getClient,
  isAvailable,
  isMemoryEnabled,
  isInvestigationEnabled,
  logger,
}: CreateManagedWorkflowsInstallerOptions): ManagedWorkflowsInstaller => {
  let queue: Promise<void> = Promise.resolve();
  let reconciled = false;

  const runInstall = async (): Promise<void> => {
    if (!(await isAvailable())) {
      logger.debug(
        'significant_events: availability flag disabled, skipping managed workflow installation'
      );
      return;
    }

    const client = await getClient();

    await installWorkflows({
      client,
      isSignificantEventsMemoryEnabled: await isMemoryEnabled(),
    });

    if (await isInvestigationEnabled()) {
      await installInvestigationWorkflow({ client });
    }

    // Log success only after the whole sequence (including reconciliation) has actually landed, and
    // only once at INFO. Re-installs on later flag flips are routine, so keep them at debug.
    if (!reconciled) {
      await client.ready();
      reconciled = true;
      logger.info('Significant events managed workflows installed');
    } else {
      logger.debug('Significant events managed workflows re-installed');
    }
  };

  return {
    install: () => {
      queue = queue.catch(() => {}).then(runInstall);
      return queue;
    },
  };
};
