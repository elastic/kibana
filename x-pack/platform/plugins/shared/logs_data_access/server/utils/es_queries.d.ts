import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
export declare function existsQuery(field: string): QueryDslQueryContainer[];
export declare function kqlQuery(kql?: string): estypes.QueryDslQueryContainer[];
