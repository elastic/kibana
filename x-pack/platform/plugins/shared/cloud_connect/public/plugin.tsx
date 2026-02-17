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
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type {
  CloudConnectedPluginSetup,
  CloudConnectedPluginStart,
  CloudConnectedSetupDeps,
  CloudConnectedStartDeps,
  CloudConnectConfig,
} from './types';
import { CloudConnectTelemetryService } from './telemetry/service';
import { CloudConnectApiService } from './lib/api';
import { createUseCloudConnectStatusHook } from './hooks';

export type { CloudConnectedPluginSetup, CloudConnectedPluginStart };

export class CloudConnectedPlugin
  implements
    Plugin<
      CloudConnectedPluginSetup,
      CloudConnectedPluginStart,
      CloudConnectedSetupDeps,
      CloudConnectedStartDeps
    >
{
  private readonly config: CloudConnectConfig;
  private readonly telemetry = new CloudConnectTelemetryService();
  private homeSetup?: HomePublicPluginSetup;
  private managementSetup?: ManagementSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<CloudConnectConfig>();
  }

  public setup(
    core: CoreSetup<CloudConnectedStartDeps>,
    plugins: CloudConnectedSetupDeps
  ): CloudConnectedPluginSetup {
    // Skip plugin registration if running on Elastic Cloud.
    // This plugin is only for self-managed clusters connecting to Cloud services
    if (plugins.cloud?.isCloudEnabled) {
      return {};
    }

    // Store plugin setup references for registering hooks in start()
    this.homeSetup = plugins.home;
    this.managementSetup = plugins.management;

    // Setup telemetry
    this.telemetry.setup(core.analytics);

    // Register the app in the management section
    const cloudUrl = this.config.cloudUrl;
    const telemetryService = this.telemetry.getClient();

    core.application.register({
      id: 'cloud_connect',
      title: i18n.translate('xpack.cloudConnect.appTitle', {
        defaultMessage: 'Cloud Connect',
      }),
      order: 9035,
      euiIconType: 'logoCloud',
      category: DEFAULT_APP_CATEGORIES.management,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const apiService = new CloudConnectApiService(coreStart.http);
        const { CloudConnectedApp } = await import('./application/mount_plugin');
        return CloudConnectedApp(
          coreStart,
          depsStart,
          params,
          cloudUrl,
          telemetryService,
          apiService
        );
      },
    });

    return {};
  }

  public start(core: CoreStart): CloudConnectedPluginStart {
    const useCloudConnectStatus = createUseCloudConnectStatusHook({ http: core.http });

    // Register the hook with home plugin if available.
    // We use this registration pattern instead of having home depend on cloudConnect
    // because that would create a circular dependency (cloudConnect → management → home -> cloudConnect).
    if (this.homeSetup) {
      this.homeSetup.addData.registerCloudConnectStatusHook(useCloudConnectStatus);
    }

    // We use this registration pattern instead of having management depend on cloudConnect
    // because that would create a circular dependency (cloudConnect → management → cloudConnect).
    if (this.managementSetup) {
      this.managementSetup.registerAutoOpsStatusHook(useCloudConnectStatus);
    }

    return {
      hooks: {
        useCloudConnectStatus,
      },
    };
  }

  public stop() {}
}
