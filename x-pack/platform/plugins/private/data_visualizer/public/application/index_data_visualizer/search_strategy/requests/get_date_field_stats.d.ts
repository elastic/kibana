import type { estypes } from '@elastic/elasticsearch';
import type { Observable } from 'rxjs';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { FieldStatsCommonRequestParams, FieldStatsError } from '../../../../../common/types/field_stats';
import type { Field, DateFieldStats } from '../../../../../common/types/field_stats';
export declare const getDateFieldsStatsRequest: (params: FieldStatsCommonRequestParams, fields: Field[]) => {
    project_routing?: string | undefined;
    runtime_mappings?: estypes.MappingRuntimeFields | undefined;
    query: estypes.QueryDslQueryContainer;
    aggs: Record<string, estypes.AggregationsAggregationContainer>;
    index: string;
    size: number;
};
export declare const fetchDateFieldsStats: (dataSearch: ISearchStart, params: FieldStatsCommonRequestParams, fields: Field[], options: ISearchOptions) => Observable<DateFieldStats[] | FieldStatsError>;
