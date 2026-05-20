import type { PluginInitializerContext } from '@kbn/core/public';
import { SavedObjectTaggingPlugin } from './plugin';
export type { SavedObjectTaggingPluginStart } from './types';
export declare const plugin: (initializerContext: PluginInitializerContext) => SavedObjectTaggingPlugin;
