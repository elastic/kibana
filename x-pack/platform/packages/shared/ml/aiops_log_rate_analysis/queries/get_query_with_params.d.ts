import type { estypes } from '@elastic/elasticsearch';
import type { FieldValuePair } from '@kbn/ml-agg-utils';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const getTermsQuery: ({ fieldName, fieldValue }: FieldValuePair) => {
    term: {
        [x: string]: string | number;
    };
};
interface QueryParams {
    params: AiopsLogRateAnalysisSchema<'3'>;
    termFilters?: FieldValuePair[];
    filter?: estypes.QueryDslQueryContainer;
    skipRangeQuery?: boolean;
}
export declare const getQueryWithParams: ({ params, termFilters, filter, skipRangeQuery, }: QueryParams) => NonNullable<estypes.QueryDslQueryContainer>;
export {};
