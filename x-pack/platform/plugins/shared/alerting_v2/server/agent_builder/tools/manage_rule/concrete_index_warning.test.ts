/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findBackingIndices,
  formatBackingIndexWarning,
  formatInheritedBackingIndexWarning,
} from './concrete_index_warning';

describe('findBackingIndices', () => {
  it('detects a data stream backing index and derives its base name', () => {
    expect(
      findBackingIndices('FROM .ds-logs-nginx.access-default-2026.06.11-000001 | STATS COUNT(*)')
    ).toEqual([
      {
        index: '.ds-logs-nginx.access-default-2026.06.11-000001',
        baseName: 'logs-nginx.access-default',
      },
    ]);
  });

  it('preserves the cross-cluster prefix', () => {
    expect(
      findBackingIndices('FROM remote:.ds-logs-app-default-2026.06.11-000042 | LIMIT 1')
    ).toEqual([
      {
        index: 'remote:.ds-logs-app-default-2026.06.11-000042',
        baseName: 'remote:logs-app-default',
      },
    ]);
  });

  it('returns only the backing indices from a comma-separated source list', () => {
    const matches = findBackingIndices(
      'FROM metrics-*, .ds-logs-app-default-2026.06.11-000001, logs-other-default | LIMIT 1'
    );

    expect(matches).toEqual([
      { index: '.ds-logs-app-default-2026.06.11-000001', baseName: 'logs-app-default' },
    ]);
  });

  it('detects backing indices in a TS source', () => {
    expect(
      findBackingIndices('TS .ds-metrics-system.cpu-default-2026.06.11-000001 | LIMIT 1')
    ).toEqual([
      {
        index: '.ds-metrics-system.cpu-default-2026.06.11-000001',
        baseName: 'metrics-system.cpu-default',
      },
    ]);
  });

  it('keeps the name unchanged when a `.ds-` source has no generation suffix', () => {
    expect(findBackingIndices('FROM .ds-logs-app-default | LIMIT 1')).toEqual([
      { index: '.ds-logs-app-default', baseName: 'logs-app-default' },
    ]);
  });

  it.each([
    ['a wildcard pattern', 'FROM logs-* | LIMIT 1'],
    ['a wildcard over backing indices', 'FROM .ds-logs-app-default-* | LIMIT 1'],
    ['a data stream name', 'FROM logs-nginx.access-default | LIMIT 1'],
    ['a cross-cluster wildcard', 'FROM remote:logs-* | LIMIT 1'],
    ['a user-chosen name with a numeric suffix', 'FROM orders-000123 | LIMIT 1'],
    ['a daily index', 'FROM logstash-2026.06.11 | LIMIT 1'],
    ['a bare generation number', 'FROM logs-000001 | LIMIT 1'],
    ['a date-only suffix on a six-digit name', 'FROM logs-2026.06.11 | LIMIT 1'],
    ['a wildcard over a generation index', 'FROM logs-nginx-2026.06.11-* | LIMIT 1'],
  ])('does not flag %s', (_description, query) => {
    expect(findBackingIndices(query)).toEqual([]);
  });

  it('detects a generation index written without the `.ds-` prefix', () => {
    expect(
      findBackingIndices('FROM logs-nginx.access-default-2026.06.11-000001 | LIMIT 1')
    ).toEqual([
      {
        index: 'logs-nginx.access-default-2026.06.11-000001',
        baseName: 'logs-nginx.access-default',
      },
    ]);
  });

  it('detects a prefix-less generation index behind a cross-cluster prefix', () => {
    expect(findBackingIndices('FROM remote:logs-app-2026.06.11-000007 | LIMIT 1')).toEqual([
      { index: 'remote:logs-app-2026.06.11-000007', baseName: 'remote:logs-app' },
    ]);
  });

  it('returns an empty list when the query has no source command', () => {
    expect(findBackingIndices('ROW a = 1')).toEqual([]);
  });
});

describe('formatBackingIndexWarning', () => {
  it('names every index with its base name', () => {
    const warning = formatBackingIndexWarning([
      { index: '.ds-logs-a-default-2026.06.11-000001', baseName: 'logs-a-default' },
      { index: '.ds-logs-b-default-2026.06.11-000001', baseName: 'logs-b-default' },
    ]);

    expect(warning).toContain(
      '`.ds-logs-a-default-2026.06.11-000001` (base name `logs-a-default`)'
    );
    expect(warning).toContain(
      '`.ds-logs-b-default-2026.06.11-000001` (base name `logs-b-default`)'
    );
  });

  it('instructs the model to respect an explicit request and otherwise retry', () => {
    const warning = formatBackingIndexWarning([
      { index: '.ds-logs-a-default-2026.06.11-000001', baseName: 'logs-a-default' },
    ]);

    expect(warning).toContain('explicitly asked');
    expect(warning).toContain('call the operation again');
  });

  it('uses the given query name and defaults to a generic one', () => {
    const matches = [{ index: '.ds-logs-a-default-2026.06.11-000001', baseName: 'logs-a-default' }];

    expect(formatBackingIndexWarning(matches, 'The recovery query')).toMatch(
      /^The recovery query targets/
    );
    expect(formatBackingIndexWarning(matches)).toMatch(/^The query targets/);
  });
});

describe('formatInheritedBackingIndexWarning', () => {
  const matches = [{ index: '.ds-logs-a-default-2026.06.11-000001', baseName: 'logs-a-default' }];

  it('tells the model to leave the existing source unchanged', () => {
    const warning = formatInheritedBackingIndexWarning(matches, 'The rule query');

    expect(warning).toMatch(/^The rule query still targets/);
    expect(warning).toContain(
      '`.ds-logs-a-default-2026.06.11-000001` (base name `logs-a-default`)'
    );
    expect(warning).toContain('Leave it unchanged unless the user asks');
  });

  it('does not instruct the model to retarget the query', () => {
    const warning = formatInheritedBackingIndexWarning(matches);

    expect(warning).not.toContain('call the operation again');
    expect(warning).not.toContain('wildcard');
  });
});
