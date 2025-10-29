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
  PluginInitializerContext,
} from '@kbn/core/server';
import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { MaintenanceWindowsConfig } from './config';
import { maintenanceWindowFeature } from './maintenance_window_feature';
import { registerSavedObject } from './saved_objects';
import {
  initializeMaintenanceWindowEventsGenerator,
  scheduleMaintenanceWindowEventsGenerator,
} from './tasks/events_generation_task';
import { MaintenanceWindowRequestHandlerContext } from './types';
import { LicenseState, type ILicenseState } from './lib';
import { defineRoutes } from './routes';
import { ReplaySubject, Subject } from 'rxjs';
import { MaintenanceWindowClientFactory } from './maintenance_window_client_factory';

export interface MaintenanceWindowsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  // eventLog: IEventLogService;
  features: FeaturesPluginSetup;
}

export interface MaintenanceWindowsPluginsStart {
  taskManager: TaskManagerStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  features: FeaturesPluginStart;
  //  eventLog: IEventLogClientService;
  licensing: LicensingPluginStart;
  //  spaces?: SpacesPluginStart;
}

export class MaintenanceWindowsPlugin {
  private readonly config: MaintenanceWindowsConfig;
  private licenseState: ILicenseState | null = null;
  private readonly logger: Logger;
  private pluginStop$: Subject<void>;
  private readonly maintenanceWindowClientFactory: MaintenanceWindowClientFactory;

  constructor(initializerContext: PluginInitializerContext<MaintenanceWindowsConfig>) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
    this.pluginStop$ = new ReplaySubject(1);
    this.maintenanceWindowClientFactory = new MaintenanceWindowClientFactory();
  }

  public setup(
    core: CoreSetup<MaintenanceWindowsPluginsStart, unknown>,
    plugins: MaintenanceWindowsPluginsSetup
  ) {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    // Note 1 - is it needed?
    //     core.capabilities.registerProvider(() => {
    //   return {
    //     management: {
    //       insightsAndAlerting: {
    //         triggersActions: true,
    //         maintenanceWindows: true,
    //       },
    //     },
    //   };
    // });

    if (this.config.maintenanceWindow.enabled) {
      plugins.features.registerKibanaFeature(maintenanceWindowFeature);
    }

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

    // Routes
    const router = core.http.createRouter<MaintenanceWindowRequestHandlerContext>();
    // Register routes
    defineRoutes({
      router,
      licenseState: this.licenseState,
      maintenanceWindowsConfig: this.config,
    });
  }

  public start(core: CoreStart, plugins: MaintenanceWindowsPluginsStart) {
    const { logger, maintenanceWindowClientFactory, licenseState } = this;
    maintenanceWindowClientFactory.initialize({
      logger: this.logger,
      savedObjectsService: core.savedObjects,
      securityService: core.security,
      uiSettings: core.uiSettings,
    });

    const getMaintenanceWindowClientWithRequest = (request: KibanaRequest) => {
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
