/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConversationRoundAuthorDisplayName } from './conversation';

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
