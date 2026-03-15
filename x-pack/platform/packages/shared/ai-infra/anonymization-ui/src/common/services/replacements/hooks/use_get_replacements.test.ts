/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGetReplacementsQueryFn, buildGetReplacementsRetryFn } from './use_get_replacements';

describe('buildGetReplacementsQueryFn', () => {
  const getReplacements = jest.fn();
  const deanonymizeText = jest.fn();
  const getTokenToOriginalMap = jest.fn();
  const client = { getReplacements, deanonymizeText, getTokenToOriginalMap };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when replacementsId is not provided', async () => {
    const queryFn = buildGetReplacementsQueryFn(client, undefined);
    await expect(queryFn()).resolves.toBeNull();
    expect(getReplacements).not.toHaveBeenCalled();
  });

  it('returns replacements when client call succeeds', async () => {
    const replacements = { id: 'rep-1', namespace: 'default', replacements: [] };
    getReplacements.mockResolvedValue(replacements);

    const queryFn = buildGetReplacementsQueryFn(client, 'rep-1');
    await expect(queryFn()).resolves.toEqual(replacements);
    expect(getReplacements).toHaveBeenCalledWith('rep-1');
  });

  it('returns null for not_found errors', async () => {
    getReplacements.mockRejectedValue({ kind: 'not_found' });

    const queryFn = buildGetReplacementsQueryFn(client, 'rep-404');
    await expect(queryFn()).resolves.toBeNull();
  });

  it('rethrows unexpected errors', async () => {
    const error = new Error('boom');
    getReplacements.mockRejectedValue(error);

    const queryFn = buildGetReplacementsQueryFn(client, 'rep-err');
    await expect(queryFn()).rejects.toThrow('boom');
  });
});

describe('buildGetReplacementsRetryFn', () => {
  it('does not retry for expected auth/not-found failures', () => {
    const retry = buildGetReplacementsRetryFn();
    expect(retry(0, { kind: 'not_found' })).toBe(false);
    expect(retry(0, { kind: 'forbidden' })).toBe(false);
    expect(retry(0, { kind: 'unauthorized' })).toBe(false);
  });

  it('retries generic errors up to three attempts', () => {
    const retry = buildGetReplacementsRetryFn();
    expect(retry(0, new Error('transient'))).toBe(true);
    expect(retry(1, new Error('transient'))).toBe(true);
    expect(retry(2, new Error('transient'))).toBe(true);
    expect(retry(3, new Error('transient'))).toBe(false);
  });
});
