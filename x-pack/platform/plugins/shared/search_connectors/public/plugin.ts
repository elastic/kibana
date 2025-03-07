/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { docLinks } from '@kbn/search-connectors';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { getConnectorFullTypes, getConnectorTypes } from '../common/lib/connector_types';
import {
  SearchConnectorsPluginSetup,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginStartDependencies,
} from './types';
import { PLUGIN_ID } from '../common/constants';
import { PLUGIN_NAME } from './translations';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    dependencies: SearchConnectorsPluginSetupDependencies
  ): SearchConnectorsPluginSetup {
    const { management } = dependencies;
    const connectorTypes = getConnectorTypes(core.http.staticAssets);

    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 6,
      keywords: ['search connectors', 'search'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, pluginsStartDeps, pluginStart]] = await Promise.all([
          import('./app'),
          core.getStartServices(),
        ]);

        const connectorsDefinitions = getConnectorFullTypes(core.http.staticAssets);
        return renderApp(coreStart, pluginsStartDeps, pluginStart, params, connectorsDefinitions);
      },
    });
    return {
      getConnectorTypes: () => connectorTypes,
    };
  }

  public start(
    core: CoreStart,
    services: SearchConnectorsPluginStartDependencies
  ): SearchConnectorsPluginStart {
    const { http } = core;
    docLinks.setDocLinks(core.docLinks.links);
    const connectorTypes = getConnectorFullTypes(http.staticAssets);

    return {
      getConnectorTypes: () => connectorTypes,
    };
  }

  public stop() {}
}
