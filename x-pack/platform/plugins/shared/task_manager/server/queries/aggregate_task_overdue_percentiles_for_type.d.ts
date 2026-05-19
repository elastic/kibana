/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  MappingRuntimeFields,
} from '@elastic/elasticsearch/lib/api/types';
export declare function aggregateTaskOverduePercentilesForType(type: string): {
  aggs: Record<string, AggregationsAggregationContainer>;
  query: QueryDslQueryContainer;
  runtime_mappings: MappingRuntimeFields;
};
