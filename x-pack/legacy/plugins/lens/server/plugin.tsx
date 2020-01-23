/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, KibanaConfig } from 'src/legacy/server/kbn_server';
import { Plugin, CoreSetup, CoreStart, SavedObjectsLegacyService } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../plugins/task_manager/server';
import { setupRoutes } from './routes';
import {
  registerLensUsageCollector,
  initializeLensTelemetry,
  scheduleLensTelemetry,
} from './usage';

export interface PluginSetupContract {
  savedObjects: SavedObjectsLegacyService;
  usageCollection: UsageCollectionSetup;
  config: KibanaConfig;
  server: Server;
  taskManager: TaskManagerSetupContract;
}

export interface PluginStartContract {
  server: Server;
  taskManager: TaskManagerStartContract;
}

const taskManagerStartContract$ = new Subject<TaskManagerStartContract>();

export class LensServer implements Plugin<{}, {}, {}, {}> {
  setup(core: CoreSetup, plugins: PluginSetupContract) {
    setupRoutes(core, plugins);
    registerLensUsageCollector(
      plugins.usageCollection,
      taskManagerStartContract$.pipe(first()).toPromise()
    );
    initializeLensTelemetry(plugins.server, plugins.taskManager);
    return {};
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    scheduleLensTelemetry(plugins.server, plugins.taskManager);
    taskManagerStartContract$.next(plugins.taskManager);
    taskManagerStartContract$.complete();
    return {};
  }

  stop() {}
}
