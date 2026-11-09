/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { CONNECTOR_MEMORY_PLUGIN_ID } from '../common/constants';
import { crawlStepCommonDefinition } from '../common/crawl_step';
import { ConnectorMemoryApi } from './api';
import type { ConnectorMemorySetupDependencies } from './types';

/** Where the page sits among Stack Management apps: right after Connectors. */
const APP_ORDER = 3;

export class ConnectorMemoryPlugin implements Plugin<void, void, ConnectorMemorySetupDependencies> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ConnectorMemorySetupDependencies): void {
    const { enabled } = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!enabled) {
      return;
    }

    // The API client needs core's HTTP, which exists once the app has started.
    let api: Promise<ConnectorMemoryApi> | undefined;
    const getApi = () =>
      (api ??= core
        .getStartServices()
        .then(([coreStart]) => new ConnectorMemoryApi(coreStart.http)));

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: CONNECTOR_MEMORY_PLUGIN_ID,
      title: i18n.translate('xpack.connectorMemory.appTitle', {
        defaultMessage: 'Connector memory',
      }),
      order: APP_ORDER,
      async mount(params: ManagementAppMountParams) {
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params, await getApi());
      },
    });

    // The Context tab on the Edit connector flyout, for connector types that declare Context Engine support.
    void import('./context_tab').then(({ createContextTab }) =>
      plugins.triggersActionsUi.registerConnectorFlyoutTab(createContextTab(getApi))
    );

    // The crawl as a workflow step, so the workflow editor knows it.
    plugins.workflowsExtensions.registerStepDefinition(async () =>
      createPublicStepDefinition({
        ...crawlStepCommonDefinition,
        icon: React.lazy(() =>
          import('@elastic/eui/es/components/icon/assets/refresh').then(({ icon }) => ({
            default: icon,
          }))
        ),
      })
    );
  }

  public start(): void {}

  public stop(): void {}
}
