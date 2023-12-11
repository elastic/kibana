/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { addExcludeFrozenToQuery } from './src/add_exclude_frozen_to_query';
export { buildBaseFilterCriteria } from './src/build_base_filter_criteria';
export { ES_CLIENT_TOTAL_HITS_RELATION } from './src/es_client_total_hits_relation';
export { getSafeAggregationName } from './src/get_safe_aggregation_name';
export { SEARCH_QUERY_LANGUAGE } from './src/types';
export type { SearchQueryLanguage } from './src/types';
export { getDefaultDSLQuery } from './src/get_default_query';
