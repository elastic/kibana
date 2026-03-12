/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PLUGIN_NAME } from '../common/constants';
import type {
  RunningQueriesSetupDependencies,
  RunningQueriesStartDependencies,
  RunningQueriesPluginSetup,
  RunningQueriesPluginStart,
} from './types';

export class RunningQueriesPlugin
  implements
    Plugin<
      RunningQueriesPluginSetup,
      RunningQueriesPluginStart,
      RunningQueriesSetupDependencies,
      RunningQueriesStartDependencies
    >
{
  public setup(
    core: CoreSetup<RunningQueriesStartDependencies>,
    plugins: RunningQueriesSetupDependencies
  ): RunningQueriesPluginSetup {
    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: 'running_queries',
      title: PLUGIN_NAME,
      order: 99,
      async mount(params: ManagementAppMountParams) {
        const { renderApp } = await import('./application/mount_plugin');
        const [coreStart, pluginsStart] = await core.getStartServices();
        return renderApp(coreStart, pluginsStart, params);
      },
    });

    return {};
  }

  public start(): RunningQueriesPluginStart {
    return {};
  }

  public stop(): void {}
}
