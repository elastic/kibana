/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetConfigType } from '../../common/types';
import type { FleetStartServices } from '../plugin';
import type { UIExtensionsStorage } from '../types';

export interface FleetAppServices {
  startServices: FleetStartServices;
  config: FleetConfigType;
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
}

let appServices: FleetAppServices | undefined;

/**
 * Module singleton, set in the plugin's `start()`.
 *
 * `FleetStartServices` is core plus every one of Fleet's own start dependencies, so a plugin
 * embedding Integrations UI cannot assemble it without taking on Fleet's whole dependency list.
 * Holding it here lets Fleet hand out a ready provider instead (see `EmbeddedIntegrationsProvider`).
 */
export function setFleetAppServices(services: FleetAppServices) {
  appServices = services;
}

export function getFleetAppServices(): FleetAppServices {
  if (!appServices) {
    throw new Error('Fleet app services are not initialized');
  }
  return appServices;
}
