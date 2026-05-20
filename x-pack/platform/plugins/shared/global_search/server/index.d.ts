import type { PluginInitializer } from '@kbn/core/server';
import type { GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps } from './plugin';
import type { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
export declare const plugin: PluginInitializer<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps>;
export { config } from './config';
export type { GlobalSearchBatchedResults, GlobalSearchProviderFindOptions, GlobalSearchProviderResult, GlobalSearchProviderResultUrl, GlobalSearchResult, } from '../common/types';
export type { GlobalSearchFindOptions, GlobalSearchProviderContext, GlobalSearchPluginStart, GlobalSearchPluginSetup, GlobalSearchResultProvider, RouteHandlerGlobalSearchContext, } from './types';
