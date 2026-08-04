import type { estypes } from '@elastic/elasticsearch';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { Field, FieldExamples, FieldStatsCommonRequestParams, FieldStatsError } from '../../../../../common/types/field_stats';
export declare const getFieldExamplesRequest: (params: FieldStatsCommonRequestParams, field: Field) => {
    project_routing?: string | undefined;
    runtime_mappings?: estypes.MappingRuntimeFields | undefined;
    fields: string[];
    _source: boolean;
    query: {
        bool: {
            filter: estypes.QueryDslQueryContainer[];
        };
    };
    index: string;
    size: number;
};
export declare const fetchFieldsExamples: (dataSearch: ISearchStart, params: FieldStatsCommonRequestParams, fields: Field[], options: ISearchOptions) => import("rxjs").Observable<(FieldStatsError | FieldExamples)[]>;
