/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { formatDefaultAggregationResult } from './format_default_aggregation_result';
export { transformAggregateQueryRequest } from './transform_aggregate_query_request/latest';
export { transformAggregateBodyResponse } from './transform_aggregate_body_response/latest';

export { transformAggregateQueryRequest as transformAggregateQueryRequestV1 } from './transform_aggregate_query_request/v1';
export { transformAggregateBodyResponse as transformAggregateBodyResponseV1 } from './transform_aggregate_body_response/v1';
