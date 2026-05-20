import type { estypes } from '@elastic/elasticsearch';
import type { Category } from './types';
export declare const QUERY_MODE: {
    readonly INCLUDE: "should";
    readonly EXCLUDE: "must_not";
};
export type QueryMode = (typeof QUERY_MODE)[keyof typeof QUERY_MODE];
export declare const getCategoryQuery: (field: string, categories: Category[], mode?: QueryMode) => Record<string, estypes.QueryDslBoolQuery>;
