/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ChangeHistoryDocument } from './src/types';

/**
 * Creates a child test client carrying Kibana's product origin. Elasticsearch reserves
 * direct access to system data streams, so plain Jest and FTR clients cannot manage
 * `.kibana_change_history` without this header. See elastic/kibana#279803.
 */
export const asKibanaClient = (client: Client): Client =>
  client.child({ headers: { 'x-elastic-product-origin': 'kibana' } });

/**
 * Build a fully-typed {@link ChangeHistoryDocument} for use in unit tests. All
 * required fields are populated with sensible defaults so callers only need to
 * supply the bits they care about via `overrides`. Use shallow spread to extend
 * the result with consumer-specific fields (e.g. `rule` for
 * `RuleChangeHistoryDocument`).
 */
export const generateChangeHistoryDocument = (
  overrides: Partial<ChangeHistoryDocument> = {}
): ChangeHistoryDocument => ({
  '@timestamp': new Date().toISOString(),
  ecs: { version: '9.3.0' },
  user: { name: 'test-user' },
  event: {
    id: 'event-1',
    action: 'rule_update',
    type: 'change',
    module: 'security',
    dataset: 'alerting-rules',
  },
  object: {
    id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
    type: 'alert',
    hash: 'h',
    fields: { hashed: [], redacted: [] },
    snapshot: {},
  },
  service: { type: 'kibana', version: 'test' },
  ...overrides,
});
