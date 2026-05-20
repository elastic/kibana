import type { CoreSetup, ApplicationStart, IBasePath } from '@kbn/core/public';
import type { GlobalSearchResultProvider, GlobalSearchProviderResult } from '@kbn/global-search-plugin/public';
import type { CustomIntegrationsSetup } from '@kbn/custom-integrations-plugin/public';
import type { PackageListItem } from './types';
/** Exported for testing only @internal */
export declare const toSearchResult: (pkg: PackageListItem, application: ApplicationStart, basePath: IBasePath) => GlobalSearchProviderResult[];
export declare const createPackageSearchProvider: (core: CoreSetup) => GlobalSearchResultProvider;
export declare const createCustomIntegrationsSearchProvider: (customIntegrations: CustomIntegrationsSetup) => GlobalSearchResultProvider;
