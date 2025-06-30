/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server/plugin';
import { DefaultRouteHandlerResources } from '@kbn/server-route-repository';

export interface ObservabilityNavigationServer {
  core: CoreStart;
  logger: Logger;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityNavigationPluginSetup {}

export interface ObservabilityNavigationPluginStart {
  core: CoreStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityNavigationPluginSetupDependencies {}

export interface ObservabilityNavigationPluginStartDependencies {
  fleet?: FleetStartContract;
}

export type ObservabilityNavigationPluginRequestHandlerContext = Omit<
  DefaultRouteHandlerResources,
  'core' | 'resolve'
> & {
  core: Promise<{
    savedObjects: {
      client: SavedObjectsClientContract;
    };
  }>;
};
