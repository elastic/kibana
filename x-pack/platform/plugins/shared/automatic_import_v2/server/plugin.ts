/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  AutomaticImportV2PluginCoreSetupDependencies,
  AutomaticImportV2PluginSetup,
  AutomaticImportV2PluginSetupDependencies,
  AutomaticImportV2PluginStart,
  AutomaticImportV2PluginStartDependencies,
  AutomaticImportV2PluginRequestHandlerContext,
} from './types';
import { RequestContextFactory } from './request_context_factory';
import { AutomaticImportService } from './services';
import { AUTOMATIC_IMPORT_FEATURE } from './feature';
import { registerRoutes } from './routes/register_routes';
import {
  INTEGRATION_SAVED_OBJECT_TYPE,
  DATA_STREAM_SAVED_OBJECT_TYPE,
} from './services/saved_objects/constants';

export class AutomaticImportV2Plugin
  implements
    Plugin<
      AutomaticImportV2PluginSetup,
      AutomaticImportV2PluginStart,
      AutomaticImportV2PluginSetupDependencies,
      AutomaticImportV2PluginStartDependencies
    >
{
  private readonly logger: Logger;
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private automaticImportService: AutomaticImportService | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
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
    core: AutomaticImportV2PluginCoreSetupDependencies,
    plugins: AutomaticImportV2PluginSetupDependencies
  ) {
    this.logger.debug('automaticImportV2: Setup');

    plugins.features.registerKibanaFeature(AUTOMATIC_IMPORT_FEATURE);

    this.automaticImportService = new AutomaticImportService(
      this.logger,
      core.savedObjects,
      plugins.taskManager,
      core
    );

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      automaticImportService: this.automaticImportService,
    });

    core.http.registerRouteHandlerContext<
      AutomaticImportV2PluginRequestHandlerContext,
      'automaticImportv2'
    >('automaticImportv2', (context, request) => requestContextFactory.create(context, request));

    const router = core.http.createRouter<AutomaticImportV2PluginRequestHandlerContext>();
    registerRoutes(router, this.logger);

    return {
      actions: plugins.actions,
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
    plugins: AutomaticImportV2PluginStartDependencies
  ): AutomaticImportV2PluginStart {
    this.logger.debug('automaticImportV2: Started');

    if (!this.automaticImportService) {
      throw new Error('AutomaticImportService not initialized during setup');
    }

    const savedObjectsClient = core.savedObjects.createInternalRepository([
      INTEGRATION_SAVED_OBJECT_TYPE,
      DATA_STREAM_SAVED_OBJECT_TYPE,
    ]);

    this.automaticImportService
      .initialize(new SavedObjectsClient(savedObjectsClient), plugins.taskManager)
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
