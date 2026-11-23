/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';

// The body schema of these APIs reaches the mapping field union, which the validator evaluates in
// every branch at every nesting level. Validation time grows exponentially with the depth of the
// mapping, so a single call can block the event loop for minutes. Their body is sent unvalidated
// and the target API rejects what it does not accept.
// See https://github.com/elastic/kibana/issues/306184.
export const unvalidatedBodyApis: Record<ApiTarget, readonly string[]> = {
  elasticsearch: [
    'cluster.put_component_template',
    'indices.create',
    'indices.create_from',
    'indices.put_data_stream_mappings',
    'indices.put_index_template',
    'indices.put_mapping',
    'indices.put_template',
    'indices.rollover',
    'indices.simulate_index_template',
    'indices.simulate_template',
    'simulate.ingest',
  ],
  kibana: [],
};

/**
 * Tells whether the body params of an API are sent without being validated against its schema.
 *
 * @param target - Backend the API belongs to.
 * @param api - API identifier, formed from the namespace and name (e.g. `"indices.create"`).
 * @returns True when only the path and query params of the API are validated.
 */
export const isBodyValidationSkipped = (target: ApiTarget, api: string): boolean =>
  unvalidatedBodyApis[target].includes(api);
