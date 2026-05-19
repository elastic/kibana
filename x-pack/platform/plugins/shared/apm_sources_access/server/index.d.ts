import type { PluginInitializerContext } from '@kbn/core/server';
import type { ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart } from './plugin';
import { config } from './config';
import { configSchema, type APMSourcesAccessConfig, type APMIndices } from '../common/config_schema';
declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").ApmSourcesAccessPlugin>;
export { APM_AGENT_CONFIGURATION_INDEX, APM_CUSTOM_LINK_INDEX, APM_SOURCE_MAP_INDEX, } from './constants';
export type { APIEndpoint, APIReturnType, APMSourcesServerRouteRepository, APIClientRequestParamsOf, } from './routes';
export type { APMIndices, APMSourcesAccessConfig, ApmSourcesAccessPluginSetup, ApmSourcesAccessPluginStart, };
export { configSchema, config, plugin };
