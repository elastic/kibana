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
  ElasticsearchClient,
} from '@kbn/core/server';

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
import { integrationSavedObjectType } from './services/saved_objects/integration';
import { dataStreamSavedObjectType } from './services/saved_objects/data_stream';
import { AutomaticImportService } from './services';

export class AutomaticImportV2Plugin
  implements
  Plugin<
    AutomaticImportV2PluginSetup,
    AutomaticImportV2PluginStart,
    AutomaticImportV2PluginSetupDependencies,
    AutomaticImportV2PluginStartDependencies
  > {
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

    core.savedObjects.registerType(integrationSavedObjectType);
    core.savedObjects.registerType(dataStreamSavedObjectType);

    const coreStartServices = core.getStartServices().then(([coreStart]) => ({
      esClient: coreStart.elasticsearch.client.asInternalUser as ElasticsearchClient,
      savedObjectsClient: coreStart.savedObjects.createInternalRepository(),
    }));
    const esClientPromise = coreStartServices.then(({ esClient }) => esClient);
    const savedObjectsClientPromise = coreStartServices.then(
      ({ savedObjectsClient }) => savedObjectsClient
    );

    this.automaticImportService = new AutomaticImportService(
      this.logger,
      esClientPromise,
      savedObjectsClientPromise
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

    if (this.automaticImportService) {
      this.automaticImportService.initialize(core.security).catch((error) => {
        this.logger.error('Failed to initialize AutomaticImportService', error);
      });
    }

    return {
      actions: plugins.actions,
      inference: plugins.inference,
      licensing: plugins.licensing,
      security: plugins.security,
    };
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
