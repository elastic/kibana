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
  QueryActivitySetupDependencies,
  QueryActivityStartDependencies,
  QueryActivityPluginSetup,
  QueryActivityPluginStart,
} from './types';

export class QueryActivityPlugin
  implements
    Plugin<
      QueryActivityPluginSetup,
      QueryActivityPluginStart,
      QueryActivitySetupDependencies,
      QueryActivityStartDependencies
    >
{
  public setup(
    core: CoreSetup<QueryActivityStartDependencies>,
    plugins: QueryActivitySetupDependencies
  ): QueryActivityPluginSetup {
    plugins.management.sections.section.clusterPerformance.registerApp({
      id: 'queryActivity',
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

  public start(): QueryActivityPluginStart {
    return {};
  }

  public stop(): void {}
}
