/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IngestHubStartDependencies } from '../types';

export interface IngestHubStartServices {
  core: CoreStart;
  deps: IngestHubStartDependencies;
  kibanaVersion: string;
}

let startServices: IngestHubStartServices | undefined;

/**
 * Module singleton, set in the plugin's `start()`.
 *
 * Components that Ingest Hub exports to other plugins (e.g. the Add integration modal) are
 * rendered inside a host's React tree, so they cannot receive Ingest Hub's own start services
 * through props without every host wiring them. Fleet uses the same pattern for its HTTP client
 * (`setHttpClient`) and its experimental features service.
 */
export function setStartServices(services: IngestHubStartServices) {
  startServices = services;
}

export function getStartServices(): IngestHubStartServices {
  if (!startServices) {
    throw new Error('Ingest Hub start services are not initialized');
  }
  return startServices;
}
