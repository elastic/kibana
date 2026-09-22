/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';

import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import type {
  AutomaticImportPluginSetup,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
} from './types';
import type { Services } from './services/types';
import { useGetAllIntegrations } from './common/hooks/use_get_all_integrations';
import { useGetIntegrationById } from './common/hooks/use_get_integration_by_id';
import { getCreateIntegrationLazy } from './components/create_integration';
import { getCreateIntegrationSideCardButtonLazy } from './components/create_integration_card_button';
import { getDataStreamResultsFlyoutComponent } from './components/data_stream_results_flyout';
import { AutomaticImportTelemetry } from './services/telemetry';

export class AutomaticImportPlugin
  implements Plugin<AutomaticImportPluginSetup, AutomaticImportPluginStart>
{
  private telemetry = new AutomaticImportTelemetry();
  private readonly renderUpselling$ = new BehaviorSubject<React.ReactNode | undefined>(undefined);

  public setup(
    core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportPluginStart>
  ): AutomaticImportPluginSetup {
    // Register EBT telemetry event types
    this.telemetry.setup(core.analytics);

    const telemetry = this.telemetry;
    const renderUpselling$ = this.renderUpselling$;
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, plugins] = await core.getStartServices();
        return renderApp({
          coreStart,
          plugins,
          params,
          telemetryService: telemetry.start(),
          renderUpselling$: renderUpselling$.asObservable(),
        });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    dependencies: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    const telemetry = this.telemetry.start();
    const services: Services = {
      ...core,
      ...dependencies,
      telemetry,
      renderUpselling$: this.renderUpselling$.asObservable(),
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
      renderUpselling: (UpsellComponent) => {
        this.renderUpselling$.next(
          UpsellComponent ? React.createElement(UpsellComponent) : undefined
        );
      },
    };
  }

  public stop() {}
}
