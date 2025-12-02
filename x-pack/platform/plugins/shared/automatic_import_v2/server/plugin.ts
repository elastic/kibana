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
import { AutomaticImportService } from './services';
import { AUTOMATIC_IMPORT_FEATURE } from './feature';

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

    const coreStartServices = core.getStartServices().then(([coreStart]) => ({
      esClient: coreStart.elasticsearch.client.asInternalUser as ElasticsearchClient,
    }));
    const esClientPromise = coreStartServices.then(({ esClient }) => esClient);

    this.automaticImportService = new AutomaticImportService(
      this.logger,
      esClientPromise,
      core.savedObjects,
      plugins.taskManager
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

    if (!plugins.security) {
      throw new Error('Security service not initialized.');
    }

    if (!core.savedObjects) {
      throw new Error('SavedObjects service not initialized.');
    }

    if (!plugins.taskManager) {
      throw new Error('TaskManager service not initialized.');
    }

    if (!this.automaticImportService) {
      throw new Error('AutomaticImportService not initialized during setup');
    }

    this.automaticImportService
      .initialize(core.security, core.savedObjects, plugins.taskManager)
      .then(() => {
        this.logger.debug('AutomaticImportService initialized successfully');
      })
      .catch((error) => {
        this.logger.error('Failed to initialize AutomaticImportService', error);
      });

    this.logger.info('TaskManagerService initialized successfully');

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
