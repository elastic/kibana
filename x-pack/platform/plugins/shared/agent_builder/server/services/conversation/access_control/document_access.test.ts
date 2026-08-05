/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationAccessControlMode, type UserIdAndName } from '@kbn/agent-builder-common';
import type { ConversationProperties } from '../client/storage';
import { getConversationPermissions } from './document_access';

const user: UserIdAndName = {
  id: 'user-profile-id',
  username: 'alice',
};

const conversation = (overrides: Partial<ConversationProperties> = {}): ConversationProperties => ({
  agent_id: 'agent-1',
  user_id: 'owner-profile-id',
  user_name: 'owner',
  space: 'default',
  title: 'Conversation',
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
  conversation_rounds: [],
  ...overrides,
});

describe('getConversationPermissions', () => {
  it('grants rename and delete to the owner matched by profile id', () => {
    expect(
      getConversationPermissions({
        conversation: conversation({ user_id: user.id, user_name: 'old-alice' }),
        user,
      })
    ).toEqual({ rename: true, delete: true });
  });

  it('grants rename and delete to the owner of a legacy conversation without a profile id', () => {
    expect(
      getConversationPermissions({
        conversation: conversation({ user_id: undefined, user_name: user.username }),
        user,
      })
    ).toEqual({ rename: true, delete: true });
  });

  it('denies rename and delete to a participant of a public conversation', () => {
    expect(
      getConversationPermissions({
        conversation: conversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        user,
      })
    ).toEqual({ rename: false, delete: false });
  });

  it('denies rename and delete on a public conversation owned by a service account', () => {
    expect(
      getConversationPermissions({
        conversation: conversation({
          user_id: 'relay-service-account-profile-id',
          user_name: 'relay-service-account',
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        user,
      })
    ).toEqual({ rename: false, delete: false });
  });

  it('denies rename and delete to a non-owner of a private conversation', () => {
    expect(getConversationPermissions({ conversation: conversation(), user })).toEqual({
      rename: false,
      delete: false,
    });
  });
});
