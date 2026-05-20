import type { Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { GlobalSearchResult, GlobalSearchProviderFindParams } from '../../common/types';
import type { GlobalSearchFindOptions } from './types';
/**
 * Fetch the server-side results from the GS internal HTTP API.
 *
 * @remarks
 * Though this function returns an Observable, the current implementation is not streaming
 * results from the server. All results will be returned in a single batch when
 * all server-side providers are completed.
 */
export declare const fetchServerResults: (http: HttpStart, params: GlobalSearchProviderFindParams, { preference, aborted$ }: GlobalSearchFindOptions) => Observable<GlobalSearchResult[]>;
