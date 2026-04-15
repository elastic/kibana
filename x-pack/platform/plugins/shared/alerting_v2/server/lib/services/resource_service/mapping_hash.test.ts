/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeMappingHash } from './mapping_hash';

describe('computeMappingHash', () => {
  it('returns a 64-character hex SHA-256 digest', () => {
    const hash = computeMappingHash({ foo: 'bar' });

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for identical input', () => {
    const input = { '@timestamp': { type: 'date' }, actor: { type: 'keyword' } };

    expect(computeMappingHash(input)).toBe(computeMappingHash(input));
  });

  it('produces a deterministic hash regardless of key insertion order', () => {
    const a = { z_field: { type: 'keyword' }, a_field: { type: 'date' } };
    const b = { a_field: { type: 'date' }, z_field: { type: 'keyword' } };

    expect(computeMappingHash(a)).toBe(computeMappingHash(b));
  });

  it('produces different hashes for different content', () => {
    const a = { field: { type: 'keyword' } };
    const b = { field: { type: 'text' } };

    expect(computeMappingHash(a)).not.toBe(computeMappingHash(b));
  });

  it('produces different hashes when a field is added', () => {
    const before = { existing: { type: 'keyword' } };
    const after = { existing: { type: 'keyword' }, new_field: { type: 'text' } };

    expect(computeMappingHash(before)).not.toBe(computeMappingHash(after));
  });

  it('handles empty input', () => {
    const hash = computeMappingHash({});

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles deeply nested objects deterministically', () => {
    const a = { outer: { inner: { deep: 'value' }, other: 'x' } };
    const b = { outer: { other: 'x', inner: { deep: 'value' } } };

    expect(computeMappingHash(a)).toBe(computeMappingHash(b));
  });
});
