/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SESSION_ID_LENGTH, resolvePromptCaching } from './prompt_caching';

describe('resolvePromptCaching', () => {
  it('returns nothing when no session id is provided', () => {
    expect(resolvePromptCaching({ headers: {} })).toEqual({});
  });

  it('uses prompt_cache_key as the session id', () => {
    expect(resolvePromptCaching({ promptCacheKey: 'ses_1', headers: {} })).toEqual({
      sessionId: 'ses_1',
      cacheControl: { type: 'ephemeral', ttl: '5m' },
    });
  });

  it('prefers prompt_cache_key over session headers', () => {
    expect(
      resolvePromptCaching({ promptCacheKey: 'body', headers: { 'x-session-id': 'header' } })
        .sessionId
    ).toBe('body');
  });

  it('falls back to the x-session-id header', () => {
    expect(resolvePromptCaching({ headers: { 'x-session-id': 'ses_2' } }).sessionId).toBe('ses_2');
  });

  it('falls back to the x-session-affinity header', () => {
    expect(resolvePromptCaching({ headers: { 'x-session-affinity': 'ses_3' } }).sessionId).toBe(
      'ses_3'
    );
  });

  it('uses the first value of multi-value headers', () => {
    expect(resolvePromptCaching({ headers: { 'x-session-id': ['a', 'b'] } }).sessionId).toBe('a');
  });

  it('ignores blank and oversized session ids', () => {
    expect(resolvePromptCaching({ promptCacheKey: '  ', headers: {} })).toEqual({});
    expect(
      resolvePromptCaching({ headers: { 'x-session-id': 'x'.repeat(MAX_SESSION_ID_LENGTH + 1) } })
    ).toEqual({});
  });

  it('maps 24h retention to the longest EIS ttl', () => {
    expect(
      resolvePromptCaching({ promptCacheKey: 'ses_1', promptCacheRetention: '24h', headers: {} })
        .cacheControl
    ).toEqual({ type: 'ephemeral', ttl: '1h' });
  });
});
