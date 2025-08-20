/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsConversationOwner } from './sharing_helpers';
import type { ConversationResponse, User } from '../schemas';

describe('getIsConversationOwner', () => {
  const user: User = { id: 'user1', name: 'Alice' };
  const otherUser: User = { id: 'user2', name: 'Bob' };

  it('returns false for loading state (undefined user)', () => {
    const conversation = { id: 'abc', createdBy: user, users: [user] };
    expect(getIsConversationOwner(conversation, undefined)).toBe(false);
  });

  it('returns false for loading state (undefined conversation)', () => {
    expect(getIsConversationOwner(undefined, user)).toBe(false);
  });

  it('returns false for loading state (empty conversation id)', () => {
    const conversation = { id: '', createdBy: user, users: [user] };
    expect(getIsConversationOwner(conversation, user)).toBe(false);
  });

  it('returns true if user is owner by id', () => {
    const conversation = { id: 'abc', createdBy: user, users: [user, otherUser] };
    expect(getIsConversationOwner(conversation, user)).toBe(true);
  });

  it('returns true if user is owner by name', () => {
    const conversation = {
      id: 'abc',
      createdBy: { id: 'userX', name: 'Alice' },
      users: [user, otherUser],
    };
    expect(getIsConversationOwner(conversation, user)).toBe(true);
  });

  it('returns true for legacy conversation (single user)', () => {
    const conversation = {
      id: 'abc',
      createdBy: undefined,
      users: [user],
    } as unknown as ConversationResponse;
    expect(getIsConversationOwner(conversation, user)).toBe(true);
  });

  it('returns false if user is not owner', () => {
    const conversation = { id: 'abc', createdBy: user, users: [user, otherUser] };
    expect(getIsConversationOwner(conversation, otherUser)).toBe(false);
  });

  it('returns false for legacy conversation (single user, not owner)', () => {
    const conversation = {
      id: 'abc',
      createdBy: undefined,
      users: [user],
    } as unknown as ConversationResponse;
    expect(getIsConversationOwner(conversation, otherUser)).toBe(false);
  });
});
