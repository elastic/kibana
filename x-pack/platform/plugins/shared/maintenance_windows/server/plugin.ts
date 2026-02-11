/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  IContextProvider,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { maintenanceWindowFeature } from './maintenance_window_feature';
import { registerSavedObject } from './saved_objects';
import {
  initializeMaintenanceWindowEventsGenerator,
  scheduleMaintenanceWindowEventsGenerator,
} from './tasks/events_generation_task';
import type { MaintenanceWindowRequestHandlerContext, MaintenanceWindowClientApi } from './types';
import { LicenseState, type ILicenseState } from './lib';
import { MaintenanceWindowClientFactory } from './maintenance_window_client_factory';
import type {
  MaintenanceWindowsServerSetupDependencies,
  MaintenanceWindowsServerStartDependencies,
  MaintenanceWindowsServerStart,
} from './types';
import { defineRoutes } from './routes';

export class MaintenanceWindowsPlugin
  implements
    Plugin<
      void,
      MaintenanceWindowsServerStart,
      MaintenanceWindowsServerSetupDependencies,
      MaintenanceWindowsServerStartDependencies
    >
{
  private readonly logger: Logger;
  private licenseState: ILicenseState | null = null;
  private readonly maintenanceWindowClientFactory: MaintenanceWindowClientFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.maintenanceWindowClientFactory = new MaintenanceWindowClientFactory();
  }

  public setup(
    core: CoreSetup<MaintenanceWindowsServerStartDependencies, unknown>,
    plugins: MaintenanceWindowsServerSetupDependencies
  ) {
    this.licenseState = new LicenseState(plugins.licensing.license$);

    core.capabilities.registerProvider(() => {
      return {
        management: {
          insightsAndAlerting: {
            maintenanceWindows: true,
          },
        },
      };
    });

    plugins.features.registerKibanaFeature(maintenanceWindowFeature);

    registerSavedObject(core.savedObjects);

    initializeMaintenanceWindowEventsGenerator(
      this.logger,
      plugins.taskManager,
      core.getStartServices
    );

    core.http.registerRouteHandlerContext<
      MaintenanceWindowRequestHandlerContext,
      'maintenanceWindow'
    >('maintenanceWindow', this.createRouteHandlerContext(core));

    const router = core.http.createRouter<MaintenanceWindowRequestHandlerContext>();
    defineRoutes({
      router,
      licenseState: this.licenseState,
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: MaintenanceWindowsServerStartDependencies
  ): MaintenanceWindowsServerStart {
    const { maintenanceWindowClientFactory } = this;

    maintenanceWindowClientFactory.initialize({
      logger: this.logger,
      savedObjectsService: core.savedObjects,
      securityService: core.security,
      uiSettings: core.uiSettings,
    });

    const getMaintenanceWindowClientWithAuth = (
      request: KibanaRequest
    ): MaintenanceWindowClientApi => {
      return maintenanceWindowClientFactory.createWithAuthorization(request);
    };

    const getMaintenanceWindowClientWithoutAuth = (
      request: KibanaRequest
    ): MaintenanceWindowClientApi => {
      return maintenanceWindowClientFactory.createWithoutAuthorization(request);
    };

    const getMaintenanceWindowClientInternal = (
      request: KibanaRequest
    ): MaintenanceWindowClientApi => {
      return maintenanceWindowClientFactory.createInternal(request);
    };

    scheduleMaintenanceWindowEventsGenerator(this.logger, plugins.taskManager).catch(() => {});

    return {
      getMaintenanceWindowClientWithAuth,
      getMaintenanceWindowClientWithoutAuth,
      getMaintenanceWindowClientInternal,
    };
  }

  private createRouteHandlerContext(
    core: CoreSetup<MaintenanceWindowsServerStartDependencies, unknown>
  ): IContextProvider<MaintenanceWindowRequestHandlerContext, 'maintenanceWindow'> {
    const { maintenanceWindowClientFactory } = this;
    return async function maintenanceWindowsRouteHandlerContext(context, request) {
      return {
        getMaintenanceWindowClient: () => {
          return maintenanceWindowClientFactory.createWithAuthorization(request);
        },
      };
    };
  }

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}
