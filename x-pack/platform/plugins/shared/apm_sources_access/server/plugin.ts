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
import type { APMSourcesAccessConfig } from '../common/config_schema';

import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { registerRoutes } from './register_routes';
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
  private readonly kibanaVersion: string;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<APMSourcesAccessConfig>();
    this.logger = initContext.logger.get();
    this.kibanaVersion = initContext.env.packageInfo.version;
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
      core: {
        setup: core,
      },
      logger: this.logger,
      repository: apmSourcesSettingsRouteRepository,
      plugin: services,
      kibanaVersion: this.kibanaVersion,
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
