import type { Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { GlobalSearchFindParams, GlobalSearchBatchedResults } from '../../common/types';
import type { ILicenseChecker } from '../../common/license_checker';
import type { GlobalSearchResultProvider } from '../types';
import type { GlobalSearchClientConfigType } from '../config';
import type { GlobalSearchFindOptions } from './types';
/** @public */
export interface SearchServiceSetup {
    /**
     * Register a result provider to be used by the search service.
     *
     * @example
     * ```ts
     * setupDeps.globalSearch.registerResultProvider({
     *   id: 'my_provider',
     *   find: (term, options) => {
     *     const resultPromise = myService.search(term, options);
     *     return from(resultPromise).pipe(takeUntil(options.aborted$);
     *   },
     * });
     * ```
     *
     * @remarks
     * As results from providers registered from the client-side API will not be available from the server's `find` API,
     * registering result providers from the client should only be done when returning results that would not be retrievable
     * from the server-side. In any other situation, prefer registering your provider from the server-side instead.
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
     * startDeps.globalSearch.find({term: 'some term'}).subscribe({
     *  next: ({ results }) => {
     *   addNewResultsToList(results);
     *  },
     *  error: () => {},
     *  complete: () => {
     *   showAsyncSearchIndicator(false);
     *  }
     * });
     * ```
     *
     * @remarks
     * Emissions from the resulting observable will only contains **new** results. It is the consumer's
     * responsibility to aggregate the emission and sort the results if required.
     */
    find(params: GlobalSearchFindParams, options: GlobalSearchFindOptions): Observable<GlobalSearchBatchedResults>;
    /**
     * Returns all the searchable types registered by the underlying result providers.
     */
    getSearchableTypes(): Promise<string[]>;
}
interface SetupDeps {
    config: GlobalSearchClientConfigType;
    maxProviderResults?: number;
}
interface StartDeps {
    http: HttpStart;
    licenseChecker: ILicenseChecker;
}
/** @internal */
export declare class SearchService {
    private readonly providers;
    private config?;
    private http?;
    private maxProviderResults;
    private licenseChecker?;
    private serverTypes?;
    setup({ config, maxProviderResults }: SetupDeps): SearchServiceSetup;
    start({ http, licenseChecker }: StartDeps): SearchServiceStart;
    private getSearchableTypes;
    private performFind;
}
export {};
