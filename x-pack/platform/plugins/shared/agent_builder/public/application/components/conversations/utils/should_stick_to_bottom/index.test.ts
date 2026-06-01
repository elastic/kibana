/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldStickToBottomNow } from '.';

describe('shouldStickToBottomNow', () => {
  const base = {
    conversationId: 'conv-1',
    inboxEnabled: false,
    isAwaitingPrompt: false,
    isFetched: true,
    shouldStickToBottom: true,
  };

  it('returns true when all conditions are satisfied (inbox disabled)', () => {
    expect(shouldStickToBottomNow(base)).toBe(true);
  });

  it('returns false when isFetched is false', () => {
    expect(shouldStickToBottomNow({ ...base, isFetched: false })).toBe(false);
  });

  it('returns false when conversationId is undefined', () => {
    expect(shouldStickToBottomNow({ ...base, conversationId: undefined })).toBe(false);
  });

  it('returns false when shouldStickToBottom is false', () => {
    expect(shouldStickToBottomNow({ ...base, shouldStickToBottom: false })).toBe(false);
  });

  it('returns false when inboxEnabled and isAwaitingPrompt are both true', () => {
    expect(shouldStickToBottomNow({ ...base, inboxEnabled: true, isAwaitingPrompt: true })).toBe(
      false
    );
  });

  it('returns true when inboxEnabled is true but isAwaitingPrompt is false', () => {
    expect(shouldStickToBottomNow({ ...base, inboxEnabled: true, isAwaitingPrompt: false })).toBe(
      true
    );
  });

  it('returns true when inboxEnabled is false and isAwaitingPrompt is true', () => {
    expect(shouldStickToBottomNow({ ...base, inboxEnabled: false, isAwaitingPrompt: true })).toBe(
      true
    );
  });

  it('returns true when both inboxEnabled and isAwaitingPrompt are false', () => {
    expect(shouldStickToBottomNow({ ...base, inboxEnabled: false, isAwaitingPrompt: false })).toBe(
      true
    );
  });
});
