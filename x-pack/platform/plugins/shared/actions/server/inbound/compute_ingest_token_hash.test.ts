/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeIngestTokenHash } from './compute_ingest_token_hash';

describe('computeIngestTokenHash', () => {
  it('returns a stable hex digest for the same inputs', () => {
    const a = computeIngestTokenHash({
      connectorId: 'conn-1',
      spaceId: 'default',
      token: 'secret-token',
    });
    const b = computeIngestTokenHash({
      connectorId: 'conn-1',
      spaceId: 'default',
      token: 'secret-token',
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('binds connectorId and spaceId into the digest', () => {
    const base = computeIngestTokenHash({
      connectorId: 'conn-1',
      spaceId: 'default',
      token: 'secret-token',
    });
    expect(
      computeIngestTokenHash({
        connectorId: 'conn-2',
        spaceId: 'default',
        token: 'secret-token',
      })
    ).not.toBe(base);
    expect(
      computeIngestTokenHash({
        connectorId: 'conn-1',
        spaceId: 'other',
        token: 'secret-token',
      })
    ).not.toBe(base);
  });
});
