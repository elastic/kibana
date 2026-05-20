import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export type { SavedObjectTaggingStart, CreateTagAssignmentServiceOptions, CreateTagClientOptions, } from './types';
export type { IAssignmentService } from './services';
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").SavedObjectTaggingPlugin>;
