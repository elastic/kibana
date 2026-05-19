import type { HttpStart } from '@kbn/core/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
/**
 * Get a saved data view that matches the index pattern (as close as possible)
 * or create a new adhoc data view if no matches found
 * @param dataViews
 * @param indexPatternFromQuery
 * @param currentDataView
 * @returns
 */
export declare function getOrCreateDataViewByIndexPattern(dataViews: DataViewsContract, query: string, currentDataView: DataView | undefined, http: HttpStart): Promise<DataView>;
