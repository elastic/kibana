import type { PluginInitializer } from '@kbn/core/public';
import type { GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps } from './plugin';
import type { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
export declare const plugin: PluginInitializer<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps>;
export type { GlobalSearchBatchedResults, GlobalSearchProviderFindOptions, GlobalSearchProviderResult, GlobalSearchProviderResultUrl, GlobalSearchResult, GlobalSearchFindParams, GlobalSearchProviderFindParams, } from '../common/types';
export type { GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchResultProvider, } from './types';
export type { GlobalSearchFindOptions } from './services/types';
