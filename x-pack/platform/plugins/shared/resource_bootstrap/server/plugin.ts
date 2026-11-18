/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import {
  LEDGER_SAVED_OBJECT_TYPE,
  REQUESTS_SAVED_OBJECT_TYPE,
  STATUS_SAVED_OBJECT_TYPE,
} from '../common';
import type { EnabledResourceBootstrapConfig, ResourceBootstrapConfig } from './config';
import { LedgerClient } from './ledger/ledger_client';
import { ledgerSavedObjectType } from './ledger/ledger_saved_object';
import { ResourceKindRegistry } from './registry/resource_kind_registry';
import { RequestsClient } from './requests/requests_client';
import { requestsSavedObjectType } from './requests/requests_saved_object';
import { registerStatusRoute } from './routes/status';
import { readExpectation } from './bootstrap/run_bootstrap';
import { createSpaceExists } from './space_exists';
import { statusSavedObjectType } from './status/status_saved_object';
import { StatusClient } from './status/status_client';
import {
  registerApplyTaskDefinition,
  scheduleApplyTaskWithRetry,
} from './tasks/apply_resources_task';
import { toMessage } from './to_message';
import type {
  InternalServices,
  ResourceBootstrapSetup,
  ResourceBootstrapSetupDependencies,
  ResourceBootstrapStartDependencies,
} from './types';

export class ResourceBootstrapPlugin
  implements
    Plugin<
      ResourceBootstrapSetup,
      void,
      ResourceBootstrapSetupDependencies,
      ResourceBootstrapStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: EnabledResourceBootstrapConfig;
  private readonly kibanaVersion: string;
  private readonly registry = new ResourceKindRegistry();
  private lockManager?: LockManagerService;
  private services?: InternalServices;
  private readonly stopping = new AbortController();

  constructor(context: PluginInitializerContext<ResourceBootstrapConfig>) {
    this.logger = context.logger.get();
    // Core only creates an enabled plugin, and the schema requires `path` once enabled.
    const config = context.config.get();
    const { path } = config;
    if (path === undefined) {
      throw new Error('[path]: is required when the resource bootstrap is enabled');
    }
    this.config = { ...config, path };
    this.kibanaVersion = context.env.packageInfo.version;
  }

  setup(
    core: CoreSetup<ResourceBootstrapStartDependencies>,
    { taskManager }: ResourceBootstrapSetupDependencies
  ): ResourceBootstrapSetup {
    const getServices = () => {
      if (!this.services) {
        throw new Error('getServices called before #start');
      }
      return this.services;
    };

    core.savedObjects.registerType(statusSavedObjectType);
    core.savedObjects.registerType(ledgerSavedObjectType);
    core.savedObjects.registerType(requestsSavedObjectType);
    this.lockManager = new LockManagerService(core, this.logger);

    const { timeout, maxAttempts } = this.config;
    registerApplyTaskDefinition({ taskManager, getServices, timeout, maxAttempts });
    registerStatusRoute({ router: core.http.createRouter(), getServices });

    return { registerResourceKind: (kind) => this.registry.register(kind) };
  }

  start(core: CoreStart, { taskManager }: ResourceBootstrapStartDependencies): void {
    if (!this.lockManager) {
      throw new Error('start called before #setup');
    }
    this.registry.freeze(this.logger);
    this.services = {
      lockManager: this.lockManager,
      logger: this.logger,
      config: this.config,
      registry: this.registry,
      status: new StatusClient(
        core.savedObjects.createInternalRepository([STATUS_SAVED_OBJECT_TYPE])
      ),
      ledger: new LedgerClient(
        core.savedObjects.createInternalRepository([LEDGER_SAVED_OBJECT_TYPE])
      ),
      requests: new RequestsClient(
        core.savedObjects.createInternalRepository([REQUESTS_SAVED_OBJECT_TYPE])
      ),
      taskManager,
      spaceExists: createSpaceExists(this.registry.getSpaceExists(), this.logger),
      kibanaVersion: this.kibanaVersion,
    };

    // Not awaited, so startup is not held up; only a run holding the lock writes the status.
    const { signal } = this.stopping;
    scheduleApplyTaskWithRetry({
      taskManager,
      requests: this.services.requests,
      readExpectation: () =>
        readExpectation({ config: this.config, kibanaVersion: this.kibanaVersion }),
      logger: this.logger,
      signal,
    }).then(
      (taskId) => this.logger.info(`Scheduled ${taskId} to apply the bootstrap files`),
      (error) => {
        if (!signal.aborted) {
          this.logger.error(`Failed to schedule the resource bootstrap: ${toMessage(error)}`);
        }
      }
    );
  }

  stop(): void {
    this.stopping.abort();
  }
}
