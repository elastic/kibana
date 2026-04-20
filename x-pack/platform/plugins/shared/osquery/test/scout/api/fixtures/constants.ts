/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_API_VERSION } from '../../common/constants';

export { OSQUERY_API_VERSION };

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': OSQUERY_API_VERSION,
} as const;

export const API_PATHS = {
  DETECTION_RULES: 'api/detection_engine/rules',
  OSQUERY_SAVED_QUERIES: 'api/osquery/saved_queries',
  OSQUERY_PACKS: 'api/osquery/packs',
} as const;

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getMinimalRule = (overrides: Record<string, unknown> = {}) => ({
  type: 'query',
  index: ['auditbeat-*'],
  language: 'kuery',
  query: '_id:*',
  name: `Test rule ${uniqueId()}`,
  description: 'Test rule for Osquery response actions',
  risk_score: 21,
  severity: 'low',
  interval: '5m',
  from: 'now-360s',
  to: 'now',
  enabled: false,
  ...overrides,
});

export const getMinimalPack = (overrides: Record<string, unknown> = {}) => ({
  name: `test-pack-${uniqueId()}`,
  description: 'Test pack for Osquery Scout tests',
  enabled: true,
  queries: {
    testQuery: {
      query: 'select * from uptime;',
      interval: 3600,
    },
  },
  shards: {},
  ...overrides,
});

export const getMinimalSavedQuery = (overrides: Record<string, unknown> = {}) => ({
  id: `test-saved-query-${uniqueId()}`,
  query: 'select 1;',
  interval: '3600',
  ...overrides,
});
