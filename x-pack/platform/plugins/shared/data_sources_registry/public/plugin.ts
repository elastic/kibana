/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataSourcesRegistryPluginSetup, DataSourcesRegistryPluginStart } from './types';

export class DataSourcesRegistryPlugin
  implements Plugin<DataSourcesRegistryPluginSetup, DataSourcesRegistryPluginStart>
{
  public setup(core: CoreSetup): DataSourcesRegistryPluginSetup {
    const isPluginEnabled = core.settings.client.get<boolean>(
      'data_sources_registry.enableDataSourcesRegistry', // unregistered ff, just to make sure the UI is hidden
      false
    );

    if (isPluginEnabled) {
      core.application.register({
        id: 'dataSourcesRegistry',
        title: 'Data Sources Registry',
        appRoute: '/app/data-sources-registry',
        category: DEFAULT_APP_CATEGORIES.chat,
        visibleIn: [],
        async mount(params: AppMountParameters) {
          const { renderApp } = await import('./application');
          return renderApp(params);
        },
      });
    }

    return {};
  }

  public start(core: CoreStart): DataSourcesRegistryPluginStart {
    return {};
  }

  public stop() {}
}
