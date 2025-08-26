/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSharedIcon } from './utils';
import { ConversationSharedState, getConversationSharedState } from '@kbn/elastic-assistant-common';
import { alertConvo } from '../../mock/conversation';

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

describe('getSharedIcon', () => {
  it('returns globe for Global', () => {
    expect(getSharedIcon(ConversationSharedState.SHARED)).toBe('globe');
  });
  it('returns users for Shared', () => {
    expect(getSharedIcon(ConversationSharedState.RESTRICTED)).toBe('users');
  });
  it('returns lock for Private', () => {
    expect(getSharedIcon(ConversationSharedState.PRIVATE)).toBe('lock');
  });
  it('returns lock for unknown state', () => {
    expect(getSharedIcon('unknown' as ConversationSharedState)).toBe('lock');
  });
});
