/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ReconcilerConfig } from './config';
import { registerReconcilerTask, ensureReconcilerScheduled } from './task/reconciler_task';

interface SetupDeps {
  taskManager: TaskManagerSetupContract;
}

interface StartDeps {
  taskManager: TaskManagerStartContract;
}

export class SavedObjectsSemanticReconcilerPlugin
  implements Plugin<void, void, SetupDeps, StartDeps>
{
  private readonly logger: Logger;
  private readonly cfg: ReconcilerConfig;
  /**
   * Stored at setup time and reused in start/task-runner via getStartServices().
   * This is the standard pattern for accessing CoreStart from a task runner.
   */
  private coreSetup!: CoreSetup<StartDeps>;

  constructor(context: PluginInitializerContext<ReconcilerConfig>) {
    this.logger = context.logger.get();
    this.cfg = context.config.get();
  }

  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps): void {
    this.coreSetup = core;

    if (!this.cfg.enabled) {
      this.logger.info('[SavedObjectsSemanticReconciler] Disabled via config — skipping setup.');
      return;
    }

    registerReconcilerTask(plugins.taskManager, core, this.logger, this.cfg);
  }

  public start(_core: CoreStart, plugins: StartDeps): void {
    if (!this.cfg.enabled) {
      return;
    }

    // Bootstrap scheduling asynchronously so Kibana's start lifecycle is not blocked on
    // ES/Task Manager availability (ensureScheduled is idempotent via ensureScheduled).
    void ensureReconcilerScheduled(plugins.taskManager, this.coreSetup, this.logger, this.cfg);
  }

  public stop(): void {
    this.logger.debug('[SavedObjectsSemanticReconciler] Stopped.');
  }
}
