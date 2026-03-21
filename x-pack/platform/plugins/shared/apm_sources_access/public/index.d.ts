import type { PluginInitializer } from '@kbn/core/public';
import { type ApmSourceAccessPluginSetup, type ApmSourceAccessPluginStart } from './plugin';
export declare const plugin: PluginInitializer<ApmSourceAccessPluginSetup, ApmSourceAccessPluginStart>;
export type { ApmSourceAccessPluginStart, ApmSourceAccessPluginSetup };
export type { APMIndices } from '../common/config_schema';
export { callSourcesAPI, type SourcesApiOptions } from './api';
