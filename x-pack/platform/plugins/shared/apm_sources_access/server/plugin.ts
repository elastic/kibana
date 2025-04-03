/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { APMSourcesAccessConfig } from '../common/config_schema';

import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { apmSourcesSettingsRouteRepository } from './routes';

/**
 * APM Source setup services
 */
export type ApmSourcesAccessPluginSetup = ReturnType<ApmSourcesAccessPlugin['setup']>;
/**
 * APM Source start services
 */
export type ApmSourcesAccessPluginStart = ReturnType<ApmSourcesAccessPlugin['start']>;

export class ApmSourcesAccessPlugin
  implements Plugin<ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart>
{
  public config: APMSourcesAccessConfig;
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<APMSourcesAccessConfig>();
    this.logger = initContext.logger.get();
  }

  getApmIndices = async (savedObjectsClient: SavedObjectsClientContract) => {
    const apmIndicesFromSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...this.config.indices, ...apmIndicesFromSavedObject };
  };

  /**
   * Registers the saved object definition and ui settings
   * for APM Sources.
   */
  public setup(core: CoreSetup) {
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);

    const services = {
      apmIndicesFromConfigFile: this.config.indices,
      getApmIndices: this.getApmIndices,
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: apmSourcesSettingsRouteRepository,
      runDevModeChecks: false,
      dependencies: { sources: services },
    });

    // expose
    return services;
  }

  /**
   * Initialises the user value for APM Sources UI settings.
   */
  public start() {
    return {
      getApmIndices: this.getApmIndices,
    };
  }

  public stop() {}
}
