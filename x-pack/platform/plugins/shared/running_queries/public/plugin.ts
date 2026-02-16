/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
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
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<RunningQueriesStartDependencies>,
    plugins: RunningQueriesSetupDependencies
  ): RunningQueriesPluginSetup {
    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: 'running_queries',
      title: i18n.translate('xpack.runningQueries.management.title', {
        defaultMessage: 'Running Queries',
      }),
      order: 99,
      async mount(params: ManagementAppMountParams) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    return {};
  }

  public start(): RunningQueriesPluginStart {
    return {};
  }

  public stop(): void {}
}
