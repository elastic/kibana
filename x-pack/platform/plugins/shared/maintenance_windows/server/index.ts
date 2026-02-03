/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { MaintenanceWindowClient as MaintenanceWindowClientClass } from './client';
import type { MaintenanceWindowsConfig } from './config';
import { configSchema } from './config';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { MaintenanceWindowsPlugin } = await import('./plugin');
  return new MaintenanceWindowsPlugin(initContext);
};

export const config: PluginConfigDescriptor<MaintenanceWindowsConfig> = {
  schema: configSchema,
};

export type {
  MaintenanceWindowsServerStart,
  MaintenanceWindowsServerSetupDependencies,
  MaintenanceWindowsServerStartDependencies,
} from './types';

export type MaintenanceWindowClient = PublicMethodsOf<MaintenanceWindowClientClass>;

export type { MaintenanceWindowsConfig } from './config';

export { maintenanceWindowCategoryIdTypes } from './application/constants';
