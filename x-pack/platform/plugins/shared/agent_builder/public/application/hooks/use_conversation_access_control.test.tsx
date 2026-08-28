/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationWithPermissions } from '../../../common/http_api/conversations';
import { useConversation } from './use_conversation';
import { useInviteMembersSummary } from './use_conversation_access_control';

const mockBulkGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      userProfile: {
        bulkGet: mockBulkGet,
      },
    },
  }),
}));

jest.mock('./use_conversation', () => ({
  useConversation: jest.fn(),
}));

const mockUseConversation = jest.mocked(useConversation);

const secondMemberProfile = {
  uid: 'member-2',
  user: { username: 'sam', full_name: 'Sam Delacroix' },
  data: {},
  enabled: true,
};

const thirdMemberProfile = {
  uid: 'member-3',
  user: { username: 'yuki', full_name: 'Yuki Tanaka' },
  data: {},
  enabled: true,
};

const conversation = {
  id: 'conversation-1',
  agent_id: 'agent-1',
  user: { id: 'owner-1', username: 'ethan' },
  title: 'My conversation',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds: [],
  access_control: {
    access_mode: ConversationAccessControlMode.Private,
    entries: [
      {
        type: 'user',
        id: 'member-1',
        role: ConversationAccessControlRole.Member,
        added_at: '2026-01-01T00:00:00.000Z',
      },
      {
        type: 'user',
        id: 'member-2',
        role: ConversationAccessControlRole.Member,
        added_at: '2026-01-02T00:00:00.000Z',
      },
      {
        type: 'user',
        id: 'member-3',
        role: ConversationAccessControlRole.Member,
        added_at: '2026-01-03T00:00:00.000Z',
      },
    ],
  },
  permissions: {
    rename: false,
    delete: false,
    update_access_control: true,
  },
} as unknown as ConversationWithPermissions;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseConversationAccessControlTestWrapper';

  return Wrapper;
};

describe('useInviteMembersSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkGet.mockResolvedValue([secondMemberProfile, thirdMemberProfile]);
    mockUseConversation.mockReturnValue({
      conversation,
      isLoading: false,
      isFetching: false,
      isFetched: true,
      isError: false,
      error: null,
    });
  });

  it('uses the current conversation to show the latest shared member avatars', async () => {
    const { result } = renderHook(() => useInviteMembersSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.shouldShowSummary).toBe(true);
    });

    expect(mockBulkGet).toHaveBeenCalledTimes(1);
    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['member-2', 'member-3']),
      dataPath: 'avatar',
    });
    expect(result.current.profiles).toEqual([thirdMemberProfile, secondMemberProfile]);
    expect(result.current.extraCount).toBe(1);
  });

  it('counts members without rendered profiles as extra members', async () => {
    mockBulkGet.mockResolvedValue([thirdMemberProfile]);

    const { result } = renderHook(() => useInviteMembersSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.shouldShowSummary).toBe(true);
    });

    expect(result.current.profiles).toEqual([thirdMemberProfile]);
    expect(result.current.extraCount).toBe(2);
  });
});
