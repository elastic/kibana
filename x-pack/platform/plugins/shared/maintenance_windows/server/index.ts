import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { MaintenanceWindowClient as MaintenanceWindowClientClass } from './client';
import type { MaintenanceWindowsConfig } from './config';
import { configSchema } from './config';
import { PublicMethodsOf } from '@kbn/utility-types';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { MaintenanceWindowsPlugin } = await import('./plugin');
  return new MaintenanceWindowsPlugin(initContext);
};

export const config: PluginConfigDescriptor<MaintenanceWindowsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    maintenanceWindow: { enabled: true },
  },
};

export type {
  MaintenanceWindowsServerStart,
  MaintenanceWindowsPluginsSetup,
  MaintenanceWindowsPluginsStart,
} from './types';

export type MaintenanceWindowClient = PublicMethodsOf<MaintenanceWindowClientClass>;
