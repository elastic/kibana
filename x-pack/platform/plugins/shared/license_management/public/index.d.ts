import type { PluginInitializerContext } from '@kbn/core/public';
import { LicenseManagementUIPlugin } from './plugin';
export type { LicenseManagementUIPluginSetup, LicenseManagementUIPluginStart } from './plugin';
export declare const plugin: (ctx: PluginInitializerContext) => LicenseManagementUIPlugin;
