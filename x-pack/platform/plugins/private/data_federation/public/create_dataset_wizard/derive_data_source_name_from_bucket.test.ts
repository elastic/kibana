/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveDataSourceNameFromBucket } from './derive_data_source_name_from_bucket';

describe('deriveDataSourceNameFromBucket', () => {
  it('uses the bucket name as-is when it is available', () => {
    expect(deriveDataSourceNameFromBucket('acme-logs')).toBe('acme-logs');
  });

  it('lowercases and replaces unsupported characters', () => {
    expect(deriveDataSourceNameFromBucket('ACME.Logs')).toBe('acme-logs');
  });

  it('suffixes the name when the bucket name is taken', () => {
    expect(deriveDataSourceNameFromBucket('acme-logs', ['acme-logs'])).toBe('acme-logs-2');
    expect(deriveDataSourceNameFromBucket('acme-logs', ['acme-logs', 'acme-logs-2'])).toBe(
      'acme-logs-3'
    );
  });

  it('compares existing names case-insensitively', () => {
    expect(deriveDataSourceNameFromBucket('acme-logs', ['ACME-Logs'])).toBe('acme-logs-2');
  });

  it('returns an empty string when there is no bucket', () => {
    expect(deriveDataSourceNameFromBucket('')).toBe('');
    expect(deriveDataSourceNameFromBucket('...')).toBe('');
  });
});
