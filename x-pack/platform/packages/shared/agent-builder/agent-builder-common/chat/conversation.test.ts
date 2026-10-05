/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ZERO_MODEL_USAGE,
  getConversationRoundAuthorDisplayName,
  isZeroModelUsage,
} from './conversation';

describe('isZeroModelUsage', () => {
  it('is true for the sentinel and false for any real usage', () => {
    expect(isZeroModelUsage(ZERO_MODEL_USAGE)).toBe(true);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE })).toBe(true);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, llm_calls: 1 })).toBe(false);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, connector_id: 'c' })).toBe(false);
    expect(isZeroModelUsage({ ...ZERO_MODEL_USAGE, model: 'm' })).toBe(false);
  });
});

describe('getConversationRoundAuthorDisplayName', () => {
  it('returns undefined when author is missing', () => {
    expect(getConversationRoundAuthorDisplayName()).toBeUndefined();
  });

  it('prefers full name over username', () => {
    expect(
      getConversationRoundAuthorDisplayName({
        id: 'user-1',
        full_name: 'Alice Example',
        username: 'alice',
      })
    ).toBe('Alice Example');
  });

  it('falls back to username', () => {
    expect(
      getConversationRoundAuthorDisplayName({
        id: 'user-1',
        username: 'alice',
      })
    ).toBe('alice');
  });
});
