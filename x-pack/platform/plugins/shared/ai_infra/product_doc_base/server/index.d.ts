import type { PluginInitializer } from '@kbn/core/server';
import type { ProductDocBaseSetupContract, ProductDocBaseStartContract, ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies } from './types';
export { config } from './config';
export type { ProductDocBaseSetupContract, ProductDocBaseStartContract };
export type { SearchApi as ProductDocSearchAPI, DocSearchOptions, DocSearchResult, DocSearchResponse, } from './services/search/types';
export declare const plugin: PluginInitializer<ProductDocBaseSetupContract, ProductDocBaseStartContract, ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies>;
