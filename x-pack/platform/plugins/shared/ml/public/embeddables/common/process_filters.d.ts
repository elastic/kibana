import type { estypes } from '@elastic/elasticsearch';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
export declare function processFilters(optionalFilters?: Filter[], optionalQuery?: Query | AggregateQuery, controlledBy?: string): estypes.QueryDslQueryContainer;
