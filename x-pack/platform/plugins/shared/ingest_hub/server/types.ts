/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';

export interface IngestHubServerPluginSetup {}

export interface IngestHubServerPluginStart {}

export interface IngestHubServerPluginSetupDependencies {
  fleet: FleetSetupContract;
}

export interface IngestHubServerPluginStartDependencies {
  fleet: FleetStartContract;
}
