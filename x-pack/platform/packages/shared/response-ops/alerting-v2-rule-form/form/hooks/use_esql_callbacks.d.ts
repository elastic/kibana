import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
export interface UseEsqlCallbacksParams {
    /** Application service for capabilities and navigation */
    application: ApplicationStart;
    /** HTTP service for API calls */
    http: HttpSetup;
    /** Search service for executing ES|QL queries */
    search: ISearchStart['search'];
}
/**
 * Hook that creates ES|QL callbacks for autocomplete functionality.
 *
 * These callbacks are used by the YAML rule editor to provide
 * autocomplete suggestions for ES|QL queries.
 *
 * @example
 * ```tsx
 * const esqlCallbacks = useEsqlCallbacks({
 *   application,
 *   http,
 *   search: data.search.search,
 * });
 *
 * return <YamlEditor esqlCallbacks={esqlCallbacks} />;
 * ```
 */
export declare const useEsqlCallbacks: ({ application, http, search, }: UseEsqlCallbacksParams) => ESQLCallbacks;
