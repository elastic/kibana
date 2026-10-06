import type { AggregationsAggregationContainer, QueryDslQueryContainer, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
export declare function aggregateTaskOverduePercentilesForType(type: string): {
    aggs: Record<string, AggregationsAggregationContainer>;
    query: QueryDslQueryContainer;
    runtime_mappings: MappingRuntimeFields;
};
