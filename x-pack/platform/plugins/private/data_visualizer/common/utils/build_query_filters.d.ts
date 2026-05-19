import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/es-query';
export declare const buildFilterCriteria: (timeFieldName?: string, earliestMs?: number | string, latestMs?: number | string, query?: Query["query"]) => estypes.QueryDslQueryContainer[];
