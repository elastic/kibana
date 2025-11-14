/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudConnectedPluginStart {}

interface CloudConnectedSetupDeps {
  management: ManagementSetup;
}

export class CloudConnectedPlugin
  implements Plugin<CloudConnectedPluginSetup, CloudConnectedPluginStart, CloudConnectedSetupDeps>
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): CloudConnectedPluginSetup {
    // Register the app in the management section
    core.application.register({
      id: 'cloud_connect',
      title: i18n.translate('xpack.cloudConnect.appTitle', {
        defaultMessage: 'Cloud Connect',
      }),
      order: 9035,
      euiIconType: 'logoCloud',
      category: DEFAULT_APP_CATEGORIES.management,
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { CloudConnectedApp } = await import('./application');
        return CloudConnectedApp(coreStart, params);
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
