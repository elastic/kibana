/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNoGenerationIndex } from './assert_no_generation_index';

describe('assertNoGenerationIndex', () => {
  it.each([
    ['a wildcard pattern', 'FROM kbn-data-forge-fake_hosts.fake_hosts-* | STATS COUNT(*)'],
    ['a data stream name', 'FROM logs-nginx.access-default | LIMIT 1'],
    ['a plain index', 'FROM kbn-data-forge-fake_hosts.fake_hosts-2026-10-01 | LIMIT 1'],
    ['a user-chosen numeric suffix', 'FROM orders-000123 | LIMIT 1'],
    ['a wildcard over backing indices', 'FROM .ds-logs-app-default-* | LIMIT 1'],
    ['a cross-cluster wildcard', 'FROM remote:logs-* | LIMIT 1'],
    ['a METADATA clause', 'FROM logs-* METADATA _index | LIMIT 1'],
    ['a quoted wildcard', 'FROM "logs-*" | LIMIT 1'],
    ['a TS source', 'TS metrics-system.cpu-* | LIMIT 1'],
  ])('accepts %s', (_description, esql) => {
    expect(() => assertNoGenerationIndex(esql)).not.toThrow();
  });

  it.each([
    ['a backing index', 'FROM .ds-logs-app-default-2026.06.11-000001 | LIMIT 1'],
    ['a generation index without prefix', 'FROM logs-app-default-2026.06.11-000001 | LIMIT 1'],
    [
      'a cross-cluster backing index',
      'FROM remote:.ds-logs-app-default-2026.06.11-000001 | LIMIT 1',
    ],
    ['a double-quoted backing index', 'FROM ".ds-logs-app-default-2026.06.11-000001" | LIMIT 1'],
    ['a backtick-quoted backing index', 'FROM `.ds-logs-app-default-2026.06.11-000001` | LIMIT 1'],
    ['one bad source in a list', 'FROM logs-*, .ds-logs-app-default-2026.06.11-000001 | LIMIT 1'],
  ])('rejects %s', (_description, esql) => {
    expect(() => assertNoGenerationIndex(esql)).toThrow();
  });

  it('fails when the query has no FROM/TS source', () => {
    expect(() => assertNoGenerationIndex('ROW a = 1')).toThrow();
  });
});
