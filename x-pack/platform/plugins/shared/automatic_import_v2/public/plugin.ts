/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import type {
  AutomaticImportV2PluginSetup,
  AutomaticImportV2PluginStart,
  AutomaticImportPluginStartDependencies,
} from './types';
import { useGetAllIntegrations, useGetIntegrationById } from './common';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationSideCardButtonLazy } from './components/create_integration_card_button';

export class AutomaticImportV2Plugin
  implements Plugin<AutomaticImportV2PluginSetup, AutomaticImportV2PluginStart>
{
  constructor(_: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportV2PluginStart>
  ): AutomaticImportV2PluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, plugins] = await core.getStartServices();
        return renderApp({ coreStart, plugins, params });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportV2PluginStart {
    const services = {
      ...core,
      ...dependencies,
    };

    return {
      hooks: {
        useGetIntegrationById,
        useGetAllIntegrations,
      },
      components: {
        CreateIntegration: getCreateIntegrationLazy(services),
        CreateIntegrationSideCardButton: getCreateIntegrationSideCardButtonLazy(),
      },
    };
  }

  public stop() {}
}
