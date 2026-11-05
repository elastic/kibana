/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionPolicy } from '../fixtures/test_utils';
import { DecryptedPolicyCache } from './decrypted_policy_cache';

const defaultPolicy = createActionPolicy({ id: 'p1', spaceId: 'default' });
const spaceAPolicy = createActionPolicy({ id: 'p2', spaceId: 'space-a' });

const seededCache = (): DecryptedPolicyCache => {
  const cache = new DecryptedPolicyCache();
  cache.replaceSpaces(
    ['default', 'space-a'],
    [
      { version: 'v1', policy: defaultPolicy },
      { version: 'v1', policy: spaceAPolicy },
    ]
  );
  return cache;
};

describe('DecryptedPolicyCache', () => {
  it('marks the space of every policy as stale when the cache is empty', () => {
    const cache = new DecryptedPolicyCache();

    const result = cache.lookup([
      { id: 'p1', version: 'v1', namespaces: ['default'] },
      { id: 'p2', version: 'v1', namespaces: ['space-a'] },
    ]);

    expect(result).toEqual({ cached: [], staleSpaceIds: ['default', 'space-a'] });
  });

  it('returns the cached policies when every version matches', () => {
    const result = seededCache().lookup([
      { id: 'p1', version: 'v1', namespaces: ['default'] },
      { id: 'p2', version: 'v1', namespaces: ['space-a'] },
    ]);

    expect(result).toEqual({
      cached: [
        { version: 'v1', policy: defaultPolicy },
        { version: 'v1', policy: spaceAPolicy },
      ],
      staleSpaceIds: [],
    });
  });

  it('marks only the space of a changed policy as stale', () => {
    const result = seededCache().lookup([
      { id: 'p1', version: 'v1', namespaces: ['default'] },
      { id: 'p2', version: 'v2', namespaces: ['space-a'] },
    ]);

    expect(result).toEqual({
      cached: [{ version: 'v1', policy: defaultPolicy }],
      staleSpaceIds: ['space-a'],
    });
  });

  it('marks a space as stale when it has a policy the cache has not seen', () => {
    const result = seededCache().lookup([
      { id: 'p1', version: 'v1', namespaces: ['default'] },
      { id: 'p3', version: 'v1', namespaces: ['default'] },
    ]);

    expect(result).toEqual({ cached: [], staleSpaceIds: ['default'] });
  });

  it('marks a space as stale when a policy has no version', () => {
    const result = seededCache().lookup([{ id: 'p1', namespaces: ['default'] }]);

    expect(result).toEqual({ cached: [], staleSpaceIds: ['default'] });
  });

  it('evicts the policies of a replaced space that are no longer returned', () => {
    const cache = seededCache();

    cache.replaceSpaces(['default'], []);

    expect(cache.size).toBe(1);
    expect(cache.lookup([{ id: 'p1', version: 'v1', namespaces: ['default'] }])).toEqual({
      cached: [],
      staleSpaceIds: ['default'],
    });
    expect(cache.lookup([{ id: 'p2', version: 'v1', namespaces: ['space-a'] }])).toEqual({
      cached: [{ version: 'v1', policy: spaceAPolicy }],
      staleSpaceIds: [],
    });
  });

  it('does not cache a policy without a version', () => {
    const cache = new DecryptedPolicyCache();

    cache.replaceSpaces(['default'], [{ policy: defaultPolicy }]);

    expect(cache.size).toBe(0);
  });
});
