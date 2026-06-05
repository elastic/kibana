/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import type { ConversationProperties } from './storage';
import {
  canDeleteConversation,
  hasReadAccess,
  hasWriteAccess,
  isCollaborativeConversation,
  isConversationOwner,
  resolveChatMode,
  resolveTemplateSnapshotOnCreate,
} from './conversation_access';

describe('conversation_access', () => {
  const owner: UserIdAndName = { id: 'user-a', username: 'analyst_a' };
  const peer: UserIdAndName = { id: 'user-b', username: 'analyst_b' };

  const ownerOnlySource: ConversationProperties = {
    agent_id: 'agent-1',
    user_id: owner.id,
    user_name: owner.username,
    space: 'soc',
    title: 'private',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    conversation_rounds: [],
  };

  const collaborativeSource: ConversationProperties = {
    ...ownerOnlySource,
    template_id: 'incident-triage-v2',
    chat_mode: 'collaborative',
    template_snapshot: {
      template_id: 'incident-triage-v2',
      profile: 'incident',
      captured_at: '2024-01-01T00:00:00.000Z',
      chat_mode: 'collaborative',
    },
  };

  describe('resolveChatMode', () => {
    it('defaults to undefined for personal conversations', () => {
      expect(resolveChatMode(ownerOnlySource)).toBeUndefined();
    });

    it('returns collaborative from denormalized chat_mode', () => {
      expect(resolveChatMode(collaborativeSource)).toBe('collaborative');
    });

    it('maps legacy conversation_mode group to collaborative', () => {
      expect(
        resolveChatMode({
          ...ownerOnlySource,
          conversation_mode: 'group',
        })
      ).toBe('collaborative');
    });
  });

  describe('isCollaborativeConversation', () => {
    it('is false for personal chats', () => {
      expect(isCollaborativeConversation(ownerOnlySource)).toBe(false);
    });

    it('is true for collaborative investigations', () => {
      expect(isCollaborativeConversation(collaborativeSource)).toBe(true);
    });
  });

  describe('hasReadAccess', () => {
    it('allows owner on personal conversation', () => {
      expect(hasReadAccess({ source: ownerOnlySource, user: owner })).toBe(true);
    });

    it('denies peer on personal conversation', () => {
      expect(hasReadAccess({ source: ownerOnlySource, user: peer })).toBe(false);
    });

    it('allows peer on collaborative investigation in same space', () => {
      expect(hasReadAccess({ source: collaborativeSource, user: peer })).toBe(true);
    });
  });

  describe('canDeleteConversation', () => {
    it('allows only creator to delete collaborative investigation', () => {
      expect(canDeleteConversation({ source: collaborativeSource, user: owner })).toBe(true);
      expect(canDeleteConversation({ source: collaborativeSource, user: peer })).toBe(false);
    });
  });

  describe('resolveTemplateSnapshotOnCreate', () => {
    it('builds POC snapshot for known incident template_id', () => {
      const snapshot = resolveTemplateSnapshotOnCreate({
        conversation: { template_id: 'incident-triage-v2' },
        creationDate: new Date('2024-06-01T12:00:00.000Z'),
      });

      expect(snapshot).toEqual({
        template_id: 'incident-triage-v2',
        profile: 'incident',
        captured_at: '2024-06-01T12:00:00.000Z',
        chat_mode: 'collaborative',
        write_privileges: ['write_incident_investigation'],
      });
    });

    it('builds POC snapshot for non-case research template_id', () => {
      const snapshot = resolveTemplateSnapshotOnCreate({
        conversation: { template_id: 'research-notes-v1' },
        creationDate: new Date('2024-06-01T12:00:00.000Z'),
      });

      expect(snapshot).toEqual({
        template_id: 'research-notes-v1',
        profile: 'research',
        captured_at: '2024-06-01T12:00:00.000Z',
        chat_mode: 'single',
        write_privileges: [],
      });
    });

    it('returns undefined for unknown template_id', () => {
      expect(
        resolveTemplateSnapshotOnCreate({
          conversation: { template_id: 'unknown' },
          creationDate: new Date(),
        })
      ).toBeUndefined();
    });

    it('prefers explicit template_snapshot on create request', () => {
      const explicit = {
        template_id: 'custom',
        captured_at: '2024-01-01T00:00:00.000Z',
        chat_mode: 'single' as const,
      };

      expect(
        resolveTemplateSnapshotOnCreate({
          conversation: { template_id: 'incident-triage-v2', template_snapshot: explicit },
          creationDate: new Date(),
        })
      ).toBe(explicit);
    });
  });

  describe('isConversationOwner', () => {
    it('matches by user id when present', () => {
      expect(isConversationOwner({ source: ownerOnlySource, user: owner })).toBe(true);
    });

    it('matches by username fallback', () => {
      expect(
        isConversationOwner({
          source: { ...ownerOnlySource, user_id: undefined },
          user: owner,
        })
      ).toBe(true);
    });
  });

  describe('hasWriteAccess', () => {
    it('matches read access in POC', () => {
      expect(hasWriteAccess({ source: collaborativeSource, user: peer })).toBe(true);
    });
  });
});
