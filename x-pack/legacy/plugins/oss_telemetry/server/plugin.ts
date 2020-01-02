/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { PluginContract as TaskManagerPluginSetupContract } from '../../task_manager/server/plugin';
import { registerCollectors } from './lib/collectors';
import { registerTasks, scheduleTasks } from './lib/tasks';
import KbnServer from '../../../../../src/legacy/server/kbn_server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';

export interface LegacyConfig {
  get: (key: string) => string | number | boolean;
}

export interface OssTelemetrySetupDependencies {
  usageCollection: UsageCollectionSetup;
  __LEGACY: {
    config: LegacyConfig;
    xpackMainStatus: { kbnServer: KbnServer };
  };
  taskManager?: TaskManagerPluginSetupContract;
}

export class OssTelemetryPlugin implements Plugin {
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: OssTelemetrySetupDependencies) {
    registerCollectors(deps);
    registerTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
      elasticsearch: core.elasticsearch,
      config: deps.__LEGACY.config,
    });
    scheduleTasks({
      taskManager: deps.taskManager,
      xpackMainStatus: deps.__LEGACY.xpackMainStatus,
      logger: this.logger,
    });
  }

  public start() {}
}
