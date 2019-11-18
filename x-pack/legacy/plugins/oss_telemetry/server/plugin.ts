/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { PluginSetupContract as TaskManagerPluginSetupContract } from '../../task_manager/plugin';
import { registerCollectors } from './lib/collectors';
import { registerTasks, scheduleTasks } from './lib/tasks';
import KbnServer from '../../../../../src/legacy/server/kbn_server';

type UsageCollector = any;
interface UsageCollectorDefinition {
  type: string;
  isReady(): boolean;
  fetch(): Promise<any>;
}

export interface OssTelemetrySetupDependencies {
  __LEGACY: {
    telemetry: {
      collectorSet: {
        makeUsageCollector(definition: UsageCollectorDefinition): UsageCollector;
        register(collector: UsageCollector): void;
      };
    };
    config: any;
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
