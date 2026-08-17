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
  type ConversationWithoutRounds,
  type CurrentUser,
} from '@kbn/agent-builder-common';
import {
  getConversationPermissions,
  hasConversationConverseAccess,
  hasConversationDeleteAccess,
  hasConversationOwnerAccess,
  hasConversationRenameAccess,
  isConversationMember,
  isConversationOwner,
} from './authorization';

const userId = 'user-profile-id';

const user: CurrentUser = {
  id: userId,
  username: 'alice',
  isAdmin: false,
};

const conversation = (
  overrides: Partial<ConversationWithoutRounds> = {}
): ConversationWithoutRounds => ({
  id: 'conversation-1',
  agent_id: 'agent-1',
  user: {
    id: 'owner-profile-id',
    username: 'owner',
  },
  title: 'Conversation',
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
  ...overrides,
});

describe('conversation access control', () => {
  describe('isConversationOwner', () => {
    it('matches owners by profile id when both sides have one', () => {
      expect(
        isConversationOwner({
          owner: { userId: user.id, username: 'old-alice' },
          user,
        })
      ).toBe(true);
    });

    it('falls back to username for conversations that never stored a user_id', () => {
      expect(
        isConversationOwner({
          owner: { username: user.username },
          user,
        })
      ).toBe(true);
      expect(
        isConversationOwner({
          owner: { username: user.username },
          user: { username: user.username, isAdmin: false },
        })
      ).toBe(true);
    });

    it('does not fall back to username when the conversation stored a user_id', () => {
      expect(
        isConversationOwner({
          owner: { userId: 'owner-profile-id', username: user.username },
          user: { username: user.username, isAdmin: false },
        })
      ).toBe(false);
      expect(
        isConversationOwner({
          owner: { userId: 'realm:["file","file1","alice"]', username: user.username },
          user: {
            id: 'realm:["native","native1","alice"]',
            username: user.username,
            isAdmin: false,
          },
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
          user: {
            id: 'realm:["native","native1","alice"]',
            username: user.username,
            isAdmin: false,
          },
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
            access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
          }),
          user,
        })
      ).toBe(false);
    });

    it('returns false for a caller without a profile id, whatever the entries hold', () => {
      expect(
        isConversationMember({
          conversation: sharedWith(entry()),
          user: { username: user.username, isAdmin: false },
        })
      ).toBe(false);
    });
  });

  describe('operation-specific access checks', () => {
    it('allows non-owners to read public conversations', () => {
      const publicConversation = conversation({
        access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
      });

      expect(hasConversationConverseAccess({ conversation: publicConversation, user })).toBe(true);
    });

    it('does not grant owner access to non-owners of public conversations', () => {
      expect(
        hasConversationOwnerAccess({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
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

  describe('admin management of public conversations', () => {
    const publicConversation = conversation({
      access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
    });
    const privateConversation = conversation();

    it('allows an admin to rename and delete a public conversation they do not own', () => {
      expect(
        hasConversationRenameAccess({
          conversation: publicConversation,
          user: { ...user, isAdmin: true },
        })
      ).toBe(true);
      expect(
        hasConversationDeleteAccess({
          conversation: publicConversation,
          user: { ...user, isAdmin: true },
        })
      ).toBe(true);
    });

    it('denies an admin rename and delete on a private conversation they do not own', () => {
      expect(
        hasConversationRenameAccess({
          conversation: privateConversation,
          user: { ...user, isAdmin: true },
        })
      ).toBe(false);
      expect(
        hasConversationDeleteAccess({
          conversation: privateConversation,
          user: { ...user, isAdmin: true },
        })
      ).toBe(false);
    });

    it('does not grant an admin owner or converse access beyond what the access mode allows', () => {
      expect(hasConversationOwnerAccess({ conversation: publicConversation, user })).toBe(false);
      expect(hasConversationConverseAccess({ conversation: privateConversation, user })).toBe(
        false
      );
    });

    it('still denies a non-admin non-owner rename and delete on a public conversation', () => {
      expect(hasConversationRenameAccess({ conversation: publicConversation, user })).toBe(false);
      expect(hasConversationDeleteAccess({ conversation: publicConversation, user })).toBe(false);
    });

    it.each([
      ['public', ConversationAccessControlMode.Public],
      ['private', ConversationAccessControlMode.Private],
    ])('leaves the owner of a %s conversation unaffected by isAdmin', (_label, accessMode) => {
      const owned = conversation({
        user: { id: user.id, username: user.username },
        access_control: { access_mode: accessMode, entries: [] },
      });

      for (const isAdmin of [true, false]) {
        const userWithAdminStatus = { ...user, isAdmin };
        expect(
          hasConversationRenameAccess({ conversation: owned, user: userWithAdminStatus })
        ).toBe(true);
        expect(
          hasConversationDeleteAccess({ conversation: owned, user: userWithAdminStatus })
        ).toBe(true);
      }
    });
  });

  describe('getConversationPermissions', () => {
    it('grants rename and delete to the owner matched by profile id', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({ user: { id: user.id, username: 'old-alice' } }),
          user,
        })
      ).toEqual({ rename: true, delete: true, update_access_control: true });
    });

    it('grants rename and delete to the owner of a legacy conversation without a profile id', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({ user: { username: user.username } }),
          user,
        })
      ).toEqual({ rename: true, delete: true, update_access_control: true });
    });

    it('denies rename and delete to a participant of a public conversation', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
          }),
          user,
        })
      ).toEqual({ rename: false, delete: false, update_access_control: false });
    });

    it('grants rename and delete to an admin on a public conversation they do not own', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({
            access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
          }),
          user: { ...user, isAdmin: true },
        })
      ).toEqual({ rename: true, delete: true, update_access_control: false });
    });

    it('denies rename and delete to an admin on a private conversation they do not own', () => {
      expect(
        getConversationPermissions({
          conversation: conversation(),
          user: { ...user, isAdmin: true },
        })
      ).toEqual({ rename: false, delete: false, update_access_control: false });
    });

    it('denies rename and delete on a public conversation owned by a service account', () => {
      expect(
        getConversationPermissions({
          conversation: conversation({
            user: {
              id: 'relay-service-account-profile-id',
              username: 'relay-service-account',
            },
            access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
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

    it('denies managing access control to an admin on a private conversation shared with them as a member', () => {
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
          user: { ...user, isAdmin: true },
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
