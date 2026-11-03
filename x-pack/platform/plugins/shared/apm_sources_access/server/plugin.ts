/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, Plugin, Logger } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { APMSourcesAccessConfig } from '../common/config_schema';

import { apmIndicesSavedObjectDefinition } from './saved_objects/apm_indices';
import { createApmSourcesServices, createGetApmIndices } from './runtime';
import { apmSourcesAccessBridge } from './tasks/bridge';
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
    this.getApmIndices = createGetApmIndices(this.config);
  }

  getApmIndices: ReturnType<typeof createGetApmIndices>;

  /**
   * Registers the saved object definition and ui settings
   * for APM Sources.
   */
  public setup(core: CoreSetup) {
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);

    const services = createApmSourcesServices(this.config);
    apmSourcesAccessBridge.setSetup(services);

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
    const start = { getApmIndices: this.getApmIndices };
    apmSourcesAccessBridge.setStart(start);
    return start;
  }

  public stop() {}
}
