/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
  LoggerFactory,
  EventTypeOpts,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  AutomaticImportPluginCoreSetupDependencies,
  AutomaticImportPluginSetup,
  AutomaticImportPluginSetupDependencies,
  AutomaticImportPluginStart,
  AutomaticImportPluginStartDependencies,
  AutomaticImportPluginRequestHandlerContext,
} from './types';
import { RequestContextFactory } from './request_context_factory';
import { AutomaticImportService } from './services';
import { AUTOMATIC_IMPORT_FEATURE } from './feature';
import {
  automaticImportInferenceFeature,
  automaticImportParentInferenceFeature,
} from './inference_feature';
import { registerRoutes } from './routes/register_routes';
import {
  INTEGRATION_SAVED_OBJECT_TYPE,
  DATA_STREAM_SAVED_OBJECT_TYPE,
} from './services/saved_objects/constants';
import { telemetryEventsSchemas } from './telemetry';

export class AutomaticImportPlugin
  implements
    Plugin<
      AutomaticImportPluginSetup,
      AutomaticImportPluginStart,
      AutomaticImportPluginSetupDependencies,
      AutomaticImportPluginStartDependencies
    >
{
  private readonly loggerFactory: LoggerFactory;
  private readonly logger: Logger;
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private automaticImportService: AutomaticImportService | null = null;
  private productTierAllowsAutomaticImport = true;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.loggerFactory = initializerContext.logger;
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  /**
   * Setup the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginSetup
   */
  public setup(
    core: AutomaticImportPluginCoreSetupDependencies,
    plugins: AutomaticImportPluginSetupDependencies
  ) {
    this.logger.debug('automaticImport: Setup');

    // Register EBT telemetry event types (server-side)
    (
      Object.values(telemetryEventsSchemas) as Array<EventTypeOpts<Record<string, unknown>>>
    ).forEach((eventConfig) => {
      core.analytics.registerEventType(eventConfig);
    });

    plugins.features.registerKibanaFeature(AUTOMATIC_IMPORT_FEATURE);

    if (plugins.searchInferenceEndpoints) {
      plugins.searchInferenceEndpoints.features.register(automaticImportParentInferenceFeature);
      plugins.searchInferenceEndpoints.features.register(automaticImportInferenceFeature);
    }

    this.automaticImportService = new AutomaticImportService(
      this.loggerFactory,
      core.savedObjects,
      plugins.taskManager,
      core,
      core.analytics
    );

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      automaticImportService: this.automaticImportService,
      getProductTierAllowsAutomaticImport: () => this.productTierAllowsAutomaticImport,
    });

    core.http.registerRouteHandlerContext<
      AutomaticImportPluginRequestHandlerContext,
      'automaticImport'
    >('automaticImport', (context, request) => requestContextFactory.create(context, request));

    const router = core.http.createRouter<AutomaticImportPluginRequestHandlerContext>();
    registerRoutes(router, this.logger);

    return {
      actions: plugins.actions,
      setIsAvailable: (isAvailable: boolean) => {
        this.productTierAllowsAutomaticImport = isAvailable;
      },
    };
  }

  /**
   * Start the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginStart
   */
  public start(
    core: CoreStart,
    plugins: AutomaticImportPluginStartDependencies
  ): AutomaticImportPluginStart {
    this.logger.debug('automaticImport: Started');

    if (!this.automaticImportService) {
      throw new Error('AutomaticImportService not initialized during setup');
    }

    const savedObjectsClient = core.savedObjects.createInternalRepository([
      INTEGRATION_SAVED_OBJECT_TYPE,
      DATA_STREAM_SAVED_OBJECT_TYPE,
    ]);

    const internalEsClient = core.elasticsearch.client.asInternalUser;

    this.automaticImportService
      .initialize(new SavedObjectsClient(savedObjectsClient), plugins.taskManager, internalEsClient)
      .then(() => {
        this.logger.debug('AutomaticImportService initialized successfully');
      })
      .catch((error) => {
        this.logger.error('Failed to initialize AutomaticImportService', error);
      });

    return {};
  }

  /**
   * Stop the plugin
   */
  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
    this.automaticImportService?.stop();
  }
}
