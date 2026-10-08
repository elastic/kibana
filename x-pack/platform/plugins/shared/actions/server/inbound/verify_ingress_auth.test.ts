/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../common/routes/events/apis/ingest';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';

describe('extractIngestToken', () => {
  it('reads token from the query string', () => {
    expect(extractIngestToken({ query: { token: 'abc' }, headers: {} })).toBe('abc');
  });

  it('reads the first token when query.token is an array', () => {
    expect(extractIngestToken({ query: { token: ['first', 'second'] }, headers: {} })).toBe(
      'first'
    );
  });

  it('reads Bearer token from Authorization', () => {
    expect(
      extractIngestToken({
        query: {},
        headers: { authorization: 'Bearer from-header' },
      })
    ).toBe('from-header');
  });

  it('prefers Authorization Bearer over query token', () => {
    expect(
      extractIngestToken({
        query: { token: 'from-query' },
        headers: { authorization: 'Bearer from-header' },
      })
    ).toBe('from-header');
  });

  it('rejects tokens longer than the max length from query', () => {
    const tooLong = 'a'.repeat(INBOUND_EVENTS_TOKEN_MAX_LENGTH + 1);
    expect(extractIngestToken({ query: { token: tooLong }, headers: {} })).toBeUndefined();
  });

  it('does not fall back to query when Authorization Bearer is oversized', () => {
    const tooLong = 'a'.repeat(INBOUND_EVENTS_TOKEN_MAX_LENGTH + 1);
    expect(
      extractIngestToken({
        query: { token: 'from-query' },
        headers: { authorization: `Bearer ${tooLong}` },
      })
    ).toBeUndefined();
  });

  it('does not fall back to query when Authorization is present but not Bearer', () => {
    expect(
      extractIngestToken({
        query: { token: 'from-query' },
        headers: { authorization: 'Basic abc' },
      })
    ).toBeUndefined();
  });

  it('does not fall back to query when Authorization Bearer is empty', () => {
    expect(
      extractIngestToken({
        query: { token: 'from-query' },
        headers: { authorization: 'Bearer ' },
      })
    ).toBeUndefined();
  });
});

describe('verifyIngestToken', () => {
  const connectorId = 'connector-1';
  const spaceId = 'default';
  const token = 'super-secret-token';

  it('returns true for a matching hash', () => {
    const ingestTokenHash = computeIngestTokenHash({ connectorId, spaceId, token });
    expect(
      verifyIngestToken({
        connectorId,
        spaceId,
        providedToken: token,
        ingestTokenHash,
      })
    ).toBe(true);
  });

  it('returns false for a wrong token', () => {
    const ingestTokenHash = computeIngestTokenHash({ connectorId, spaceId, token });
    expect(
      verifyIngestToken({
        connectorId,
        spaceId,
        providedToken: 'wrong',
        ingestTokenHash,
      })
    ).toBe(false);
  });

  it('returns false when hash lengths differ', () => {
    expect(
      verifyIngestToken({
        connectorId,
        spaceId,
        providedToken: token,
        ingestTokenHash: 'abc',
      })
    ).toBe(false);
  });

  it('returns false for non-hex stored hash', () => {
    expect(
      verifyIngestToken({
        connectorId,
        spaceId,
        providedToken: token,
        ingestTokenHash: 'zzzz',
      })
    ).toBe(false);
  });
});
