import type { GlobalSearchProviderResultUrl } from './types';
export interface IBasePath {
    prepend(path: string): string;
}
/**
 * Convert a {@link GlobalSearchProviderResultUrl | provider result's url} to an absolute or relative url
 * usable in {@link GlobalSearchResult | service results}
 */
export declare const convertResultUrl: (url: GlobalSearchProviderResultUrl, basePath: IBasePath) => string;
