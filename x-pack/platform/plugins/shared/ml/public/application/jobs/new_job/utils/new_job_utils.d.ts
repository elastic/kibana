import type { estypes } from '@elastic/elasticsearch';
import type { Filter, Query, DataViewBase } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
export declare const DEFAULT_QUERY: Query;
export declare function getDefaultDatafeedQuery(): NonNullable<estypes.QueryDslQueryContainer>;
export declare function getDefaultQuery(): Query;
export declare function createSearchItems(kibanaConfig: IUiSettingsClient, indexPattern: DataViewBase | undefined, savedSearch: SavedSearch | null): {
    query: Query;
    combinedQuery: NonNullable<estypes.QueryDslQueryContainer>;
};
export declare function createQueries(data: {
    query: Query;
    filter: Filter[];
}, dataView: DataViewBase | undefined, kibanaConfig: IUiSettingsClient): {
    query: Query;
    combinedQuery: NonNullable<estypes.QueryDslQueryContainer>;
};
interface CheckCardinalitySuccessResponse {
    success: boolean;
    highCardinality?: any;
}
export declare function checkCardinalitySuccess(data: any): CheckCardinalitySuccessResponse;
export declare function getRisonValue<T extends string | boolean | number | object | undefined | null>(risonString: string, defaultValue: T): T;
export {};
