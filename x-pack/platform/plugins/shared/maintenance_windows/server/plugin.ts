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
import type { Subject } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import type { MaintenanceWindowsConfig } from './config';
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
  MaintenanceWindowsPluginsSetup,
  MaintenanceWindowsPluginsStart,
  MaintenanceWindowsServerStart,
} from './types';
import { defineRoutes } from './routes';

export class MaintenanceWindowsPlugin
  implements
    Plugin<
      void,
      MaintenanceWindowsServerStart,
      MaintenanceWindowsPluginsSetup,
      MaintenanceWindowsPluginsStart
    >
{
  private readonly logger: Logger;
  private readonly config: MaintenanceWindowsConfig;
  private licenseState: ILicenseState | null = null;
  private pluginStop$: Subject<void>;
  private readonly maintenanceWindowClientFactory: MaintenanceWindowClientFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = this.config = initializerContext.config.get();
    this.pluginStop$ = new ReplaySubject(1);
    this.maintenanceWindowClientFactory = new MaintenanceWindowClientFactory();
  }

  public setup(
    core: CoreSetup<MaintenanceWindowsPluginsStart, unknown>,
    plugins: MaintenanceWindowsPluginsSetup
  ) {
    this.logger.debug('maintenanceWindows: Setup');

    this.licenseState = new LicenseState(plugins.licensing.license$);
    // Note 1 - is it needed?
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

    registerSavedObject(core.savedObjects, this.logger);

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
      maintenanceWindowsConfig: this.config,
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: MaintenanceWindowsPluginsStart
  ): MaintenanceWindowsServerStart {
    const { maintenanceWindowClientFactory } = this;

    this.logger.debug('maintenanceWindows: Started');
    maintenanceWindowClientFactory.initialize({
      logger: this.logger,
      savedObjectsService: core.savedObjects,
      securityService: core.security,
      uiSettings: core.uiSettings,
    });

    const getMaintenanceWindowClientWithRequest = (
      request: KibanaRequest
    ): MaintenanceWindowClientApi => {
      return maintenanceWindowClientFactory!.create(request);
    };

    scheduleMaintenanceWindowEventsGenerator(this.logger, plugins.taskManager).catch(() => {});

    return {
      getMaintenanceWindowClientWithRequest,
    };
  }

  private createRouteHandlerContext(
    core: CoreSetup<MaintenanceWindowsPluginsStart, unknown>
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
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
