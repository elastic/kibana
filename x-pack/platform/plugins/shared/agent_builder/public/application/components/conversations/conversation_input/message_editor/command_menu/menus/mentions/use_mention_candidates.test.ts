/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useMentionCandidates } from './use_mention_candidates';

const mockUseConversation = jest.fn();
const mockUseUserProfiles = jest.fn();
const mockUseSuggestUsers = jest.fn();

jest.mock('../../../../../../../hooks/use_conversation', () => ({
  useConversation: () => mockUseConversation(),
  useAgentId: () => 'agent-1',
}));
jest.mock('../../../../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: { id: 'agent-1', name: 'Elastic AI Agent' } }),
}));
jest.mock('../../../../../../../hooks/use_current_user', () => ({
  useCurrentUser: () => ({ currentUser: profile('me', 'Me Myself') }),
}));
jest.mock('../../../../../../../hooks/use_user_profiles', () => ({
  useUserProfiles: (args: unknown) => mockUseUserProfiles(args),
}));
jest.mock('../../../../../../../hooks/use_suggest_users', () => ({
  useSuggestUsers: (...args: unknown[]) => mockUseSuggestUsers(...args),
}));
jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T>(value: T) => value,
}));

const profile = (uid: string, fullName: string): UserProfileWithAvatar => ({
  uid,
  enabled: true,
  user: {
    username: fullName.toLowerCase().replace(/\s/g, '.'),
    email: `${uid}@elastic.co`,
    full_name: fullName,
  },
  data: {},
});

const julian = profile('julian', 'Julian Rosado');
const andrew = profile('andrew', 'Andrew Brown');
const pierre = profile('pierre', 'Pierre Gayvallet');
const zoe = profile('zoe', 'Zoe Adams');
const knownProfiles = [julian, andrew, pierre, zoe, profile('me', 'Me Myself')];

const round = (author?: { id: string }, origin?: { type: 'slack' }) => ({ author, origin });

const makeConversation = (overrides: Partial<Conversation>): { conversation: Conversation } => ({
  conversation: {
    id: 'conv-1',
    agent_id: 'agent-1',
    user: { id: 'julian', username: 'julian.rosado' },
    rounds: [],
    ...overrides,
  } as Conversation,
});

const publicChat = (rounds: unknown[] = []) =>
  makeConversation({
    rounds: rounds as Conversation['rounds'],
    access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
  });

const privateChatSharedWith = (ids: string[]) =>
  makeConversation({
    access_control: {
      access_mode: ConversationAccessControlMode.Private,
      entries: ids.map((id) => ({
        type: 'user' as const,
        id,
        role: ConversationAccessControlRole.Member,
        added_at: '2026-10-28T00:00:00.000Z',
      })),
    },
  });

const names = (query: string) =>
  renderHook(() => useMentionCandidates(query)).result.current.candidates.map(({ name }) => name);

describe('useMentionCandidates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Like `bulkGet`: returns every known profile asked for, whatever access it has
    mockUseUserProfiles.mockImplementation(({ uids, enabled }) => ({
      data: enabled ? knownProfiles.filter(({ uid }) => uids.includes(uid)) : undefined,
      isInitialLoading: false,
    }));
    mockUseSuggestUsers.mockReturnValue({ data: [], isFetching: false });
  });

  describe('public chat', () => {
    it('lists the agent, then people in the chat, then everyone else, without duplicates', () => {
      mockUseConversation.mockReturnValue(
        publicChat([round({ id: 'andrew' }), round({ id: 'julian' }), round({ id: 'me' })])
      );
      mockUseSuggestUsers.mockReturnValue({
        data: [zoe, julian, pierre, andrew, knownProfiles[4]],
        isFetching: false,
      });

      expect(names('')).toEqual([
        'Elastic AI Agent',
        'Andrew Brown',
        'Julian Rosado',
        'Zoe Adams',
        'Pierre Gayvallet',
      ]);
    });

    it('never lists the current user', () => {
      mockUseConversation.mockReturnValue(publicChat([round({ id: 'me' })]));
      mockUseSuggestUsers.mockReturnValue({ data: [knownProfiles[4], zoe], isFetching: false });

      expect(names('')).not.toContain('Me Myself');
    });

    it('does not ask for profiles of authors that come from an external system', () => {
      mockUseConversation.mockReturnValue(
        publicChat([round({ id: 'U123SLACK' }, { type: 'slack' }), round({ id: 'andrew' })])
      );

      renderHook(() => useMentionCandidates(''));

      expect(mockUseUserProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ uids: ['julian', 'andrew'] })
      );
    });

    it('searches the space with the typed text', () => {
      mockUseConversation.mockReturnValue(publicChat());

      renderHook(() => useMentionCandidates('zo'));

      expect(mockUseSuggestUsers).toHaveBeenCalledWith('zo', { enabled: true });
    });

    it('filters people in the chat by name, username or email while typing', () => {
      mockUseConversation.mockReturnValue(publicChat([round({ id: 'andrew' })]));

      expect(names('andrew.br')).toEqual(['Andrew Brown']);
      expect(names('julian@elastic')).toEqual(['Julian Rosado']);
      expect(names('nobody')).toEqual([]);
    });

    it('skips an owner that has no user profile', () => {
      mockUseConversation.mockReturnValue({
        conversation: {
          ...publicChat([round({ id: 'andrew' })]).conversation,
          user: { id: 'service_account:bot', username: 'bot', type: 'service_account' },
        },
      });

      renderHook(() => useMentionCandidates(''));

      expect(mockUseUserProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ uids: ['andrew'] })
      );
    });
  });

  describe('private chat shared with people', () => {
    it('lists the agent, the owner and the people it is shared with, sorted by name', () => {
      mockUseConversation.mockReturnValue(privateChatSharedWith(['pierre', 'andrew']));

      expect(names('')).toEqual([
        'Elastic AI Agent',
        'Andrew Brown',
        'Julian Rosado',
        'Pierre Gayvallet',
      ]);
    });

    it('does not search the rest of the space', () => {
      mockUseConversation.mockReturnValue(privateChatSharedWith(['pierre']));
      mockUseSuggestUsers.mockReturnValue({ data: [zoe], isFetching: false });

      expect(names('')).not.toContain('Zoe Adams');
      expect(mockUseSuggestUsers).toHaveBeenCalledWith('', { enabled: false });
    });

    it('lists a member whose profile is no longer suggested (lost access)', () => {
      mockUseConversation.mockReturnValue(privateChatSharedWith(['pierre']));
      mockUseSuggestUsers.mockReturnValue({ data: [], isFetching: false });

      expect(names('')).toContain('Pierre Gayvallet');
    });
  });

  it('lists nobody in a private chat that is not shared', () => {
    mockUseConversation.mockReturnValue(privateChatSharedWith([]));

    expect(names('')).toEqual([]);
  });

  it('lists nobody before the conversation exists', () => {
    mockUseConversation.mockReturnValue({ conversation: undefined });

    expect(names('')).toEqual([]);
  });

  describe('the agent row', () => {
    beforeEach(() => {
      mockUseConversation.mockReturnValue(publicChat([round({ id: 'andrew' })]));
    });

    it('shows when the typed text is empty', () => {
      expect(names('')).toContain('Elastic AI Agent');
    });

    it('shows when the typed text matches its name', () => {
      expect(names('elastic ai')).toEqual(['Elastic AI Agent']);
    });

    it('is hidden when the typed text does not match, so Enter picks the person', () => {
      expect(names('and')).toEqual(['Andrew Brown']);
    });
  });

  describe('loading', () => {
    it('is loading while the chat people are fetched', () => {
      mockUseConversation.mockReturnValue(privateChatSharedWith(['pierre']));
      mockUseUserProfiles.mockReturnValue({ data: undefined, isInitialLoading: true });

      const { result } = renderHook(() => useMentionCandidates(''));

      expect(result.current.isLoading).toBe(true);
    });

    it('is loading while the space search is running in a public chat', () => {
      mockUseConversation.mockReturnValue(publicChat());
      mockUseSuggestUsers.mockReturnValue({ data: undefined, isFetching: true });

      const { result } = renderHook(() => useMentionCandidates('zo'));

      expect(result.current.isLoading).toBe(true);
    });

    it('is not loading when nothing is fetched', () => {
      mockUseConversation.mockReturnValue(privateChatSharedWith(['pierre']));

      const { result } = renderHook(() => useMentionCandidates(''));

      expect(result.current.isLoading).toBe(false);
    });
  });
});
