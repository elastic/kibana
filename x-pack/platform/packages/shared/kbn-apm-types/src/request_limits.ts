/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Upper bounds for request inputs (DoS hardening). Limits are deliberately generous so requests
// that were valid before keep working.

// Names, types, IDs and environments that only ever come from keyword aggregations. They are ECS
// keyword fields mapped with `ignore_above: 1024` (via `ecs@mappings`), so longer values can never
// match a document.
export const MAX_FIELD_VALUE_LENGTH = 1_024;
// Values the UI reads from `_source` (transaction/span names, dependency resources). `ignore_above`
// only stops them from being indexed, so the UI can still send the full value back.
export const MAX_DOCUMENT_VALUE_LENGTH = 10_000;
export const MAX_KUERY_LENGTH = 10_000; // KQL expressions can be long
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_FILTERS_LENGTH = 100_000; // serialized ES bool query (JSON string)
export const MAX_QUERY_PARAM_LENGTH = 1_024; // short params: ISO/datemath dates, offsets
// JSON-serialized arrays sent as one string (e.g. `groupIds`, `serviceNames`)
export const MAX_JSON_ARRAY_PARAM_LENGTH = 1_000_000;
export const MAX_ARRAY_ITEMS = 1_000;
// Every service node on the service map is sent in one request to fetch alert and SLO badges.
export const MAX_SERVICE_MAP_SERVICES = 10_000;
export const MAX_NUM_BUCKETS = 1_000; // the UI requests 8, 20 or 100
export const MAX_PAGE_SIZE = 10_000; // matches the default `index.max_result_window`
export const MAX_PAGE = 100_000;
export const MAX_PROFILING_INDEX = 1_000; // the UI requests 0..10
