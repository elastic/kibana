/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { KibanaRequest } from '@kbn/core/server';
import type { MaintenanceWindowClient } from './client';

export interface MaintenanceWindowApiRequestHandlerContext {
  getMaintenanceWindowClient: () => MaintenanceWindowClient;
}

export type MaintenanceWindowRequestHandlerContext = CustomRequestHandlerContext<{
  maintenanceWindow: MaintenanceWindowApiRequestHandlerContext;
}>;

export type MaintenanceWindowClientApi = PublicMethodsOf<MaintenanceWindowClient>;

export interface MaintenanceWindowsServerSetupDependencies {
  taskManager: TaskManagerSetupContract;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetup;
}

export interface MaintenanceWindowsServerStartDependencies {
  taskManager: TaskManagerStartContract;
}

export interface MaintenanceWindowsServerStart {
  getMaintenanceWindowClientInternal(request: KibanaRequest): MaintenanceWindowClientApi;
  getMaintenanceWindowClientWithAuth(request: KibanaRequest): MaintenanceWindowClientApi;
  getMaintenanceWindowClientWithoutAuth(request: KibanaRequest): MaintenanceWindowClientApi;
}
