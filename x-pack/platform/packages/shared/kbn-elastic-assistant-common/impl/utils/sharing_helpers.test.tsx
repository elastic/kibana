/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationSharedState,
  getConversationSharedState,
  getIsConversationOwner,
} from './sharing_helpers';
import type { ConversationResponse, User } from '../schemas';
export const alertConvo: Pick<ConversationResponse, 'id' | 'users' | 'createdBy'> = {
  users: [{ name: 'elastic' }],
  id: 'convo1',
  createdBy: { id: 'user1', name: 'elastic' },
};
describe('getConversationSharedState', () => {
  it('returns Private when conversation is undefined', () => {
    expect(getConversationSharedState(undefined)).toBe(ConversationSharedState.PRIVATE);
  });

  it('returns Private when conversation id is empty', () => {
    const convo = { ...alertConvo, id: '' };
    expect(getConversationSharedState(convo)).toBe(ConversationSharedState.PRIVATE);
  });

  it('returns Global when users array is empty', () => {
    const convo = { ...alertConvo, users: [] };
    expect(getConversationSharedState(convo)).toBe(ConversationSharedState.SHARED);
  });

  it('returns Private when users array has length 1', () => {
    const convo = { ...alertConvo, users: [alertConvo.createdBy] };
    expect(getConversationSharedState(convo)).toBe(ConversationSharedState.PRIVATE);
  });

  it('returns Shared when users array has length > 1', () => {
    const convo = { ...alertConvo, users: [alertConvo.createdBy, { id: 'user2' }] };
    expect(getConversationSharedState(convo)).toBe(ConversationSharedState.RESTRICTED);
  });
});
describe('getIsConversationOwner', () => {
  const user: User = { id: 'user1', name: 'Alice' };
  const otherUser: User = { id: 'user2', name: 'Bob' };

  it('returns true when undefined user', () => {
    const conversation = { id: 'abc', createdBy: user, users: [user] };
    expect(getIsConversationOwner(conversation, undefined)).toBe(true);
  });

  it('returns true when undefined conversation', () => {
    expect(getIsConversationOwner(undefined, user)).toBe(true);
  });

  it('returns true when user is empty object', () => {
    const conversation = { id: 'abc', createdBy: user, users: [user] };
    expect(getIsConversationOwner(conversation, {})).toBe(true);
  });

  it('returns true when empty conversation id (is new conversation)', () => {
    const conversation = { id: '', createdBy: user, users: [user] };
    expect(getIsConversationOwner(conversation, user)).toBe(true);
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
