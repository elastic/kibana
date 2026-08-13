/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  type ConversationAccessControlEntry,
  type UserIdAndName,
} from '@kbn/agent-builder-common';
import type { ConversationProperties } from '../client/storage';
import {
  getConversationPermissions,
  hasConversationConverseAccess,
  hasConversationOwnerAccess,
  isConversationMember,
  isConversationOwner,
} from './authorization';

const userId = 'user-profile-id';

const user: UserIdAndName = {
  id: userId,
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

describe('conversation access control', () => {
  describe('isConversationOwner', () => {
    it('matches owners by profile id when both sides have one', () => {
      expect(
        isConversationOwner({
          conversation: conversation({ user_id: user.id, user_name: 'old-alice' }),
          user,
        })
      ).toBe(true);
    });

    it('falls back to username for conversations that never stored a user_id', () => {
      expect(
        isConversationOwner({
          conversation: conversation({ user_id: undefined, user_name: user.username }),
          user,
        })
      ).toBe(true);
      expect(
        isConversationOwner({
          conversation: conversation({ user_id: undefined, user_name: user.username }),
          user: { username: user.username },
        })
      ).toBe(true);
    });

    it('does not fall back to username when the conversation stored a user_id', () => {
      expect(
        isConversationOwner({
          conversation: conversation({ user_id: 'owner-profile-id', user_name: user.username }),
          user: { username: user.username },
        })
      ).toBe(false);
      expect(
        isConversationOwner({
          conversation: conversation({
            user_id: 'realm:["file","file1","alice"]',
            user_name: user.username,
          }),
          user: { id: 'realm:["native","native1","alice"]', username: user.username },
        })
      ).toBe(false);
    });
  });

  describe('isConversationMember', () => {
    const entry = (
      overrides: Partial<ConversationAccessControlEntry> = {}
    ): ConversationAccessControlEntry => ({
      type: 'user',
      id: userId,
      role: ConversationAccessControlRole.Member,
      added_at: '2026-06-29T00:00:00.000Z',
      ...overrides,
    });

    const sharedWith = (...entries: ConversationAccessControlEntry[]) =>
      conversation({
        access_control: { access_mode: ConversationAccessControlMode.Private, entries },
      });

    it('matches members on the stable id', () => {
      expect(isConversationMember({ conversation: sharedWith(entry()), user })).toBe(true);
    });

    it('does not match a different id', () => {
      expect(
        isConversationMember({ conversation: sharedWith(entry({ id: 'bob-profile-id' })), user })
      ).toBe(false);
    });

    it('does not match the same username from another realm', () => {
      expect(
        isConversationMember({
          conversation: sharedWith(entry({ id: 'realm:["file","file1","alice"]' })),
          user: { id: 'realm:["native","native1","alice"]', username: user.username },
        })
      ).toBe(false);
    });

    it('ignores entries that are not user principals', () => {
      expect(
        isConversationMember({
          conversation: sharedWith(
            entry({ type: 'role' as ConversationAccessControlEntry['type'] })
          ),
          user,
        })
      ).toBe(false);
    });

    it('returns false for legacy conversations that have no entries', () => {
      expect(
        isConversationMember({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Private },
          }),
          user,
        })
      ).toBe(false);
    });

    it('returns false for a caller without a profile id, whatever the entries hold', () => {
      expect(
        isConversationMember({
          conversation: sharedWith(entry()),
          user: { username: user.username },
        })
      ).toBe(false);
    });
  });

  describe('operation-specific access checks', () => {
    it('allows non-owners to read public conversations', () => {
      const publicConversation = conversation({
        access_control: { access_mode: ConversationAccessControlMode.Public },
      });

      expect(hasConversationConverseAccess({ conversation: publicConversation, user })).toBe(true);
    });

    it('does not grant owner access to non-owners of public conversations', () => {
      expect(
        hasConversationOwnerAccess({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Public },
          }),
          user,
        })
      ).toBe(false);
    });

    it('treats missing access_control as private for non-owners', () => {
      expect(hasConversationConverseAccess({ conversation: conversation(), user })).toBe(false);
    });

    it('allows members to converse in a private conversation shared with them', () => {
      expect(
        hasConversationConverseAccess({
          conversation: conversation({
            access_control: {
              access_mode: ConversationAccessControlMode.Private,
              entries: [
                {
                  type: 'user',
                  id: userId,
                  role: ConversationAccessControlRole.Member,
                  added_at: '2026-06-29T00:00:00.000Z',
                },
              ],
            },
          }),
          user,
        })
      ).toBe(true);
    });

    it('does not grant owner access to members', () => {
      expect(
        hasConversationOwnerAccess({
          conversation: conversation({
            access_control: {
              access_mode: ConversationAccessControlMode.Private,
              entries: [
                {
                  type: 'user',
                  id: userId,
                  role: ConversationAccessControlRole.Member,
                  added_at: '2026-06-29T00:00:00.000Z',
                },
              ],
            },
          }),
          user,
        })
      ).toBe(false);
    });
  });

  describe('getConversationPermissions', () => {
    it('grants rename and delete to the owner matched by profile id', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({ user_id: user.id, user_name: 'old-alice' }),
          user,
        })
      ).toEqual({ rename: true, delete: true, update_access_control: true });
    });

    it('grants rename and delete to the owner of a legacy conversation without a profile id', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({ user_id: undefined, user_name: user.username }),
          user,
        })
      ).toEqual({ rename: true, delete: true, update_access_control: true });
    });

    it('denies rename and delete to a participant of a public conversation', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Public },
          }),
          user,
        })
      ).toEqual({ rename: false, delete: false, update_access_control: false });
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
      ).toEqual({ rename: false, delete: false, update_access_control: false });
    });

    it('denies managing access control to a member of a shared conversation', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({
            access_control: {
              access_mode: ConversationAccessControlMode.Private,
              entries: [
                {
                  type: 'user',
                  id: userId,
                  role: ConversationAccessControlRole.Member,
                  added_at: '2026-06-29T00:00:00.000Z',
                },
              ],
            },
          }),
          user,
        })
      ).toEqual({ rename: false, delete: false, update_access_control: false });
    });

    it('denies rename and delete to a non-owner of a private conversation', () => {
      expect(getConversationPermissions({ conversation: conversation(), user })).toEqual({
        rename: false,
        delete: false,
        update_access_control: false,
      });
    });
  });
});
