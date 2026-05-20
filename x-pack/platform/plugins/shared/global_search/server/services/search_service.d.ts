import type { Observable } from 'rxjs';
import type { KibanaRequest, CoreStart, IBasePath } from '@kbn/core/server';
import type { GlobalSearchBatchedResults, GlobalSearchFindParams } from '../../common/types';
import type { ILicenseChecker } from '../../common/license_checker';
import type { GlobalSearchConfigType } from '../config';
import type { GlobalSearchResultProvider, GlobalSearchFindOptions } from '../types';
/** @public */
export interface SearchServiceSetup {
    /**
     * Register a result provider to be used by the search service.
     *
     * @example
     * ```ts
     * setupDeps.globalSearch.registerResultProvider({
     *   id: 'my_provider',
     *   find: (term, options, context) => {
     *     const resultPromise = myService.search(term, options, context.core.savedObjects.client);
     *     return from(resultPromise).pipe(takeUntil(options.aborted$);
     *   },
     * });
     * ```
     */
    registerResultProvider(provider: GlobalSearchResultProvider): void;
}
/** @public */
export interface SearchServiceStart {
    /**
     * Perform a search for given `term` and {@link GlobalSearchFindOptions | options}.
     *
     * @example
     * ```ts
     * startDeps.globalSearch.find({ term: 'some term' }).subscribe({
     *  next: ({ results }) => {
     *   addNewResultsToList(results);
     *  },
     *  error: () => {},
     *  complete: () => {
     *   showAsyncSearchIndicator(false);
     * }
     * });
     * ```
     *
     * @remarks
     * - Emissions from the resulting observable will only contains **new** results. It is the consumer
     * responsibility to aggregate the emission and sort the results if required.
     * - Results from the client-side registered providers will not available when performing a search
     * from the server-side `find` API.
     */
    find(params: GlobalSearchFindParams, options: GlobalSearchFindOptions, request: KibanaRequest): Observable<GlobalSearchBatchedResults>;
    /**
     * Returns all the searchable types registered by the underlying result providers.
     */
    getSearchableTypes(request: KibanaRequest): Promise<string[]>;
}
interface SetupDeps {
    basePath: IBasePath;
    config: GlobalSearchConfigType;
    maxProviderResults?: number;
}
interface StartDeps {
    core: CoreStart;
    licenseChecker: ILicenseChecker;
}
/** @internal */
export declare class SearchService {
    private readonly providers;
    private basePath?;
    private config?;
    private contextFactory?;
    private licenseChecker?;
    private maxProviderResults;
    setup({ basePath, config, maxProviderResults, }: SetupDeps): SearchServiceSetup;
    start({ core, licenseChecker }: StartDeps): SearchServiceStart;
    private getSearchableTypes;
    private performFind;
}
export {};
