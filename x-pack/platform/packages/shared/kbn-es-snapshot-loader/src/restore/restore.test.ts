/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterIndicesToRestore } from './restore';
import { extractDataStreamName } from '../utils';

describe('filterIndicesToRestore', () => {
  it('filters regular indices by pattern', () => {
    const indices = ['logs-app-1', 'logs-app-2', 'metrics-host', 'other-index'];
    expect(filterIndicesToRestore(indices, ['logs-*'])).toEqual(['logs-app-1', 'logs-app-2']);
  });

  it('filters data stream backing indices by extracted data stream name', () => {
    const indices = [
      '.ds-logs-nginx-default-2024.01.01-000001',
      '.ds-logs-nginx-default-2024.01.02-000002',
      '.ds-metrics-system.cpu-default-2024.01.01-000001',
    ];
    expect(filterIndicesToRestore(indices, ['logs-*'])).toEqual([
      '.ds-logs-nginx-default-2024.01.01-000001',
      '.ds-logs-nginx-default-2024.01.02-000002',
    ]);
  });

  it('supports multiple patterns', () => {
    const indices = [
      '.ds-logs-app-default-2024.01.01-000001',
      '.ds-metrics-host-default-2024.01.01-000001',
      '.ds-traces-apm-default-2024.01.01-000001',
      'other-index',
    ];
    expect(filterIndicesToRestore(indices, ['logs-*', 'metrics-*'])).toEqual([
      '.ds-logs-app-default-2024.01.01-000001',
      '.ds-metrics-host-default-2024.01.01-000001',
    ]);
  });

  it('returns empty array when no matches', () => {
    expect(filterIndicesToRestore(['other-index', 'another-index'], ['logs-*'])).toEqual([]);
  });

  it('handles exact pattern matches', () => {
    expect(
      filterIndicesToRestore(['my-exact-index', 'my-exact-index-2'], ['my-exact-index'])
    ).toEqual(['my-exact-index']);
  });

  it('treats patterns as globs (escapes regex metacharacters)', () => {
    const indices = ['logs-a.b-1', 'logs-axb-1'];
    expect(filterIndicesToRestore(indices, ['logs-a.b-*'])).toEqual(['logs-a.b-1']);
  });
});

describe('extractDataStreamName', () => {
  it('extracts data stream name from backing index', () => {
    expect(extractDataStreamName('.ds-logs-nginx-default-2024.01.01-000001')).toBe(
      'logs-nginx-default'
    );
  });

  it('handles complex data stream names', () => {
    expect(extractDataStreamName('.ds-metrics-system.cpu-default-2024.12.08-000001')).toBe(
      'metrics-system.cpu-default'
    );
  });

  it('returns null for regular indices', () => {
    expect(extractDataStreamName('regular-index')).toBeNull();
  });

  it('returns null for non-backing index formats', () => {
    expect(extractDataStreamName('.ds-incomplete')).toBeNull();
    expect(extractDataStreamName('logs-nginx-default')).toBeNull();
  });
});
