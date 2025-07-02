/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import type { FleetStartContract, FleetSetupContract } from '@kbn/fleet-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { IRouter, StartServicesAccessor, Logger } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export interface SearchConnectorsPluginSetup {
  getConnectorTypes: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStart {
  cloud?: CloudStart;
  data?: DataPluginStart;
  fleet?: FleetStartContract;
  spaces?: SpacesPluginStart;
  getConnectors: () => ConnectorServerSideDefinition[];
}

export interface SearchConnectorsPluginStartDependencies {
  fleet: FleetStartContract;
  taskManager: TaskManagerStartContract;
  soClient: SavedObjectsServiceStart;
  licensing: LicensingPluginStart;
}
export interface SearchConnectorsPluginSetupDependencies {
  features: FeaturesPluginSetup;
  fleet: FleetSetupContract;
  taskManager: TaskManagerSetupContract;
  soClient: SavedObjectsServiceSetup;
  cloud: CloudSetup;
  licensing?: LicensingPluginStart;
  log: Logger;
  ml?: MlPluginSetup;
  router: IRouter;
  getStartServices: StartServicesAccessor<
    SearchConnectorsPluginStartDependencies,
    SearchConnectorsPluginStart
  >;
}
