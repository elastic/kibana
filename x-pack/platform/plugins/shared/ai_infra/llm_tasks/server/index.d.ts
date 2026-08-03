import type { PluginInitializer } from '@kbn/core/server';
import type { LlmTasksPluginSetup, LlmTasksPluginStart, PluginSetupDependencies, PluginStartDependencies } from './types';
export { config } from './config';
export type { LlmTasksPluginSetup, LlmTasksPluginStart };
export type { RetrieveDocumentationAPI, RetrieveDocumentationParams, RetrieveDocumentationResult, RetrieveDocumentationResultDoc, } from './tasks';
export declare const plugin: PluginInitializer<LlmTasksPluginSetup, LlmTasksPluginStart, PluginSetupDependencies, PluginStartDependencies>;
