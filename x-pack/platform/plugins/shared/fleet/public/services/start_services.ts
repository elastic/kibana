/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

import type { FleetStart } from '../plugin';

export interface FleetPublicStartServices {
  core: CoreStart;
  fleet: FleetStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
  kibanaVersion: string;
}

let startServices: FleetPublicStartServices | undefined;

/**
 * Module singleton, set in the plugin's `start()`.
 *
 * Components Fleet exports to other plugins (e.g. the Add integration modal) render inside a
 * host's React tree, so they cannot receive Fleet's own start services through props without
 * every host wiring them. Fleet already uses this pattern for its HTTP client (`setHttpClient`)
 * and its experimental features service.
 */
export function setStartServices(services: FleetPublicStartServices) {
  startServices = services;
}

export function getStartServices(): FleetPublicStartServices {
  if (!startServices) {
    throw new Error('Fleet start services are not initialized');
  }
  return startServices;
}
