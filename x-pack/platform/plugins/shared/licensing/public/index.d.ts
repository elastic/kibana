import type { PluginInitializerContext } from '@kbn/core/public';
import { LicensingPlugin } from './plugin';
export type { LicensingPluginSetup, LicensingPluginStart } from './types';
export declare const plugin: (context: PluginInitializerContext) => LicensingPlugin;
