/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../plugins/task_manager/server';
import { registerCollectors } from './lib/collectors';
import { registerTasks, scheduleTasks } from './lib/tasks';
import KbnServer from '../../../../../src/legacy/server/kbn_server';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';

export interface LegacyConfig {
  get: (key: string) => string | number | boolean;
}

interface OssTelemetryDependencies {
  usageCollection: UsageCollectionSetup;
  __LEGACY: {
    config: LegacyConfig;
    xpackMainStatus: { kbnServer: KbnServer };
  };
}
export interface OssTelemetrySetupDependencies extends OssTelemetryDependencies {
  taskManager?: TaskManagerSetupContract;
}
export interface OssTelemetryStartDependencies extends OssTelemetryDependencies {
  taskManager?: TaskManagerStartContract;
}

export class OssTelemetryPlugin implements Plugin {
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, deps: OssTelemetrySetupDependencies) {
    registerTasks({
      taskManager: deps.taskManager,
      logger: this.logger,
      elasticsearch: core.elasticsearch,
      config: deps.__LEGACY.config,
    });
  }

  public start(core: CoreStart, deps: OssTelemetryStartDependencies) {
    registerCollectors(deps);
    scheduleTasks({
      taskManager: deps.taskManager,
      xpackMainStatus: deps.__LEGACY.xpackMainStatus,
      logger: this.logger,
    });
  }
}
