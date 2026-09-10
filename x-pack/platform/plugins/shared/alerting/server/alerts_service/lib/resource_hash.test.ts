/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeResourceHash } from './resource_hash';

describe('computeResourceHash', () => {
  it('is stable regardless of object key order', () => {
    const a = { settings: { hidden: true, number_of_shards: 1 }, mappings: { dynamic: false } };
    const b = { mappings: { dynamic: false }, settings: { number_of_shards: 1, hidden: true } };
    expect(computeResourceHash(a)).toBe(computeResourceHash(b));
  });

  it('is stable across nested key order', () => {
    const a = { template: { settings: { a: 1, b: 2, c: { x: 1, y: 2 } } } };
    const b = { template: { settings: { c: { y: 2, x: 1 }, b: 2, a: 1 } } };
    expect(computeResourceHash(a)).toBe(computeResourceHash(b));
  });

  it('ignores undefined-valued keys (mirrors JSON serialization)', () => {
    expect(computeResourceHash({ a: 1, b: undefined })).toBe(computeResourceHash({ a: 1 }));
  });

  it('changes when a value changes', () => {
    expect(computeResourceHash({ limit: 2800 })).not.toBe(computeResourceHash({ limit: 5000 }));
  });

  it('changes when a field is added', () => {
    expect(computeResourceHash({ a: 1 })).not.toBe(computeResourceHash({ a: 1, b: 2 }));
  });

  it('is sensitive to array order', () => {
    expect(computeResourceHash({ composed_of: ['a', 'b'] })).not.toBe(
      computeResourceHash({ composed_of: ['b', 'a'] })
    );
  });

  it('returns a short hex string', () => {
    expect(computeResourceHash({ a: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });
});
