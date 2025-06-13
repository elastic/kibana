/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  IScopedClusterClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import {
  ObservabilityNavigationPluginSetupDependencies,
  ObservabilityNavigationPluginStartDependencies,
} from '../types';

export type ObservabilityNavigationRequestHandlerContext = Omit<
  DefaultRouteHandlerResources,
  'core' | 'resolve'
> & {
  core: Promise<{
    elasticsearch: {
      client: IScopedClusterClient;
    };
    savedObjects: {
      client: SavedObjectsClientContract;
    };
  }>;
};

interface PluginContractResolveCore {
  core: {
    setup: CoreSetup<ObservabilityNavigationPluginStartDependencies>;
    start: () => Promise<CoreStart>;
  };
}

type PluginContractResolveDependenciesStart = {
  [key in keyof ObservabilityNavigationPluginStartDependencies]: {
    start: () => Promise<Required<ObservabilityNavigationPluginStartDependencies>[key]>;
  };
};

type PluginContractResolveDependenciesSetup = {
  [key in keyof ObservabilityNavigationPluginSetupDependencies]: {
    setup: Required<ObservabilityNavigationPluginSetupDependencies>[key];
  };
};

export interface ObservabilityNavigationRouteHandlerResources
  extends Omit<DefaultRouteHandlerResources, 'context' | 'response'> {
  context: ObservabilityNavigationRequestHandlerContext;
  plugins: PluginContractResolveCore &
    PluginContractResolveDependenciesSetup &
    PluginContractResolveDependenciesStart;
}
