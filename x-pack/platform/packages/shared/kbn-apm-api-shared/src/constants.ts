/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Bounds the serviceName path param to satisfy the CodeQL "unbounded string in
// route validation" rule; 1024 matches the ES keyword default `ignore_above`.
export const MAX_SERVICE_NAME_LENGTH = 1_024;

// Upper bounds for request inputs, to keep unbounded user input out of route validation (DoS
// hardening). Names, types, IDs and environments are ECS keyword fields indexed with
// `ignore_above: 1024`, so longer values can never match a document.
export const MAX_FIELD_VALUE_LENGTH = 1_024;
export const MAX_KUERY_LENGTH = 10_000; // KQL expressions can be long
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_FILTERS_LENGTH = 100_000; // serialized ES bool query (JSON string)
export const MAX_QUERY_PARAM_LENGTH = 1_024; // short params: ISO/datemath dates, offsets
// JSON-serialized arrays sent as one string (e.g. `groupIds`, `serviceNames`)
export const MAX_JSON_ARRAY_PARAM_LENGTH = 1_000_000;
export const MAX_ARRAY_ITEMS = 1_000;
export const MAX_NUM_BUCKETS = 1_000; // the UI requests 8, 20 or 100
export const MAX_PAGE_SIZE = 1_000;
export const MAX_PROFILING_INDEX = 1_000; // the UI requests 0..10
