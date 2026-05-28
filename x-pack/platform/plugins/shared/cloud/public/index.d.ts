import type { PluginInitializerContext } from '@kbn/core/public';
import { CloudPlugin } from './plugin';
export type { CloudConfigType } from './plugin';
export type { CloudBasicUrls, CloudPrivilegedUrls, CloudSetup, CloudStart, CloudUrls, } from './types';
export declare function plugin(initializerContext: PluginInitializerContext): CloudPlugin;
