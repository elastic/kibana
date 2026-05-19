import type { GlobalSearchProviderResult, GlobalSearchResult } from './types';
import type { IBasePath } from './utils';
/**
 * Convert a {@link GlobalSearchProviderResult | provider result}
 * to a {@link GlobalSearchResult | service result}
 */
export declare const processProviderResult: (result: GlobalSearchProviderResult, basePath: IBasePath) => GlobalSearchResult;
