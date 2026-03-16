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
import type { Services } from './services/types';
import { useGetAllIntegrations } from './common/hooks/use_get_all_integrations';
import { useGetIntegrationById } from './common/hooks/use_get_integration_by_id';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationSideCardButtonLazy } from './components/create_integration_card_button';
import { getDataStreamResultsFlyoutComponent } from './components/data_stream_results_flyout';
import { AIV2Telemetry } from './services/telemetry';

export class AutomaticImportV2Plugin
  implements Plugin<AutomaticImportV2PluginSetup, AutomaticImportV2PluginStart>
{
  private telemetry = new AIV2Telemetry();

  constructor(_: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportV2PluginStart>
  ): AutomaticImportV2PluginSetup {
    // Register EBT telemetry event types
    this.telemetry.setup(core.analytics);

    const telemetry = this.telemetry;
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, plugins] = await core.getStartServices();
        return renderApp({ coreStart, plugins, params, telemetryService: telemetry.start() });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportV2PluginStart {
    const telemetry = this.telemetry.start();
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry,
    };

    return {
      hooks: {
        useGetIntegrationById,
        useGetAllIntegrations,
      },
      components: {
        CreateIntegration: getCreateIntegrationLazy(services),
        CreateIntegrationSideCardButton: getCreateIntegrationSideCardButtonLazy(),
        DataStreamResultsFlyout: getDataStreamResultsFlyoutComponent(),
      },
      telemetry,
    };
  }

  public stop() {}
}
