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
  KibanaRequest,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { mapValues } from 'lodash';
import {
  ObservabilityNavigationPluginSetup,
  ObservabilityNavigationPluginStart,
  ObservabilityNavigationPluginSetupDependencies,
  ObservabilityNavigationPluginStartDependencies,
} from './types';
import { observabilityNavigationRouteRepository } from './routes';
import {
  ObservabilityNavigationRouteHandlerResources,
  RouteHandlerScopedClients,
} from './routes/types';
import {
  navigationOverrides,
  createNavigationOverrides,
  createEntityDefinitions,
  createMetricDefinitions,
  observabilityEntityDefinitions,
  observabilityMetricDefinitions,
} from './saved_objects';

export class ObservabilityNavigationPlugin
  implements
    Plugin<
      ObservabilityNavigationPluginSetup,
      ObservabilityNavigationPluginStart,
      ObservabilityNavigationPluginSetupDependencies,
      ObservabilityNavigationPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.isDev = initializerContext.env.mode.dev;
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<ObservabilityNavigationPluginStartDependencies>,
    plugins: ObservabilityNavigationPluginSetupDependencies
  ) {
    core.savedObjects.registerType(navigationOverrides);
    core.savedObjects.registerType(observabilityEntityDefinitions);
    core.savedObjects.registerType(observabilityMetricDefinitions);

    createNavigationOverrides(core);
    createEntityDefinitions(core);
    createMetricDefinitions(core);

    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityNavigationPluginStartDependencies
            ];
          }),
      };
    }) as Pick<
      ObservabilityNavigationRouteHandlerResources['plugins'],
      keyof ObservabilityNavigationPluginStartDependencies
    >;

    const withCore = {
      ...routeHandlerPlugins,
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
    };

    registerRoutes({
      core,
      repository: observabilityNavigationRouteRepository,
      dependencies: {
        plugins: withCore,
        getScopedClients: async ({
          request,
        }: {
          request: KibanaRequest;
        }): Promise<RouteHandlerScopedClients> => {
          const [coreStart, plugin] = await core.getStartServices();
          return {
            scopedClusterClient: coreStart.elasticsearch.client.asScoped(request),
            soClient: coreStart.savedObjects.getScopedClient(request),
            packageClient: plugin.fleet?.packageService.asScoped(request),
          };
        },
      },
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('observability_navigation: Started');
    return {};
  }

  public stop() {}
}
