/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { PublicMethodsOf } from '@kbn/utility-types';

import type { MaintenanceWindowClient } from './client';
import { KibanaRequest } from '@kbn/core/server';

export interface MaintenanceWindowApiRequestHandlerContext {
  getMaintenanceWindowClient: () => MaintenanceWindowClient;
}

export type MaintenanceWindowRequestHandlerContext = CustomRequestHandlerContext<{
  maintenanceWindow: MaintenanceWindowApiRequestHandlerContext;
}>;

export type MaintenanceWindowClientApi = PublicMethodsOf<MaintenanceWindowClient>;

export interface MaintenanceWindowsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  usageCollection?: UsageCollectionSetup;
  // eventLog: IEventLogService;
  features: FeaturesPluginSetup;
}

export interface MaintenanceWindowsPluginsStart {
  taskManager: TaskManagerStartContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  features: FeaturesPluginStart;
  //  eventLog: IEventLogClientService;
  licensing: LicensingPluginStart;
  //  spaces?: SpacesPluginStart;
}

export interface MaintenanceWindowsServerStart {
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
}
