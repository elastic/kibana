/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

import type {
  IngestHubServerPluginSetup,
  IngestHubServerPluginStart,
  IngestHubServerPluginSetupDependencies,
  IngestHubServerPluginStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';

export class IngestHubServerPlugin
  implements
    Plugin<
      IngestHubServerPluginSetup,
      IngestHubServerPluginStart,
      IngestHubServerPluginSetupDependencies,
      IngestHubServerPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private fleetStart?: FleetStartContract;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<IngestHubServerPluginStartDependencies, IngestHubServerPluginStart>,
    plugins: IngestHubServerPluginSetupDependencies
  ): IngestHubServerPluginSetup {
    this.logger.debug('ingestHub server: Setup');

    const router = core.http.createRouter();
    const getFleetStart = (): FleetStartContract => {
      if (!this.fleetStart) {
        throw new Error('Fleet plugin not started yet');
      }
      return this.fleetStart;
    };

    registerRoutes(router, this.logger, getFleetStart);

    return {};
  }

  public start(
    core: CoreStart,
    plugins: IngestHubServerPluginStartDependencies
  ): IngestHubServerPluginStart {
    this.logger.debug('ingestHub server: Started');
    this.fleetStart = plugins.fleet;
    return {};
  }

  public stop() {}
}
