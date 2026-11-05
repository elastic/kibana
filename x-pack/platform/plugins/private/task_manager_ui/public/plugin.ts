/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { APP_ID, PLUGIN_NAME } from './constants';
import type { TaskManagerUiSetupDependencies, TaskManagerUiStartDependencies } from './types';

export class TaskManagerUiPlugin
  implements Plugin<void, void, TaskManagerUiSetupDependencies, TaskManagerUiStartDependencies>
{
  public setup(
    core: CoreSetup<TaskManagerUiStartDependencies>,
    { management }: TaskManagerUiSetupDependencies
  ) {
    management.sections.section.clusterPerformance.registerApp({
      id: APP_ID,
      title: PLUGIN_NAME,
      order: 100,
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, { data }]] = await Promise.all([
          import('./application/mount_plugin'),
          core.getStartServices(),
        ]);
        return renderApp(coreStart, data, params);
      },
    });
  }

  public start() {}

  public stop() {}
}
