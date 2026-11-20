/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../hooks/use_conversation';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useCarryOverDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationStarters } from './use_conversation_starters';

// The agent is resolved by the real hooks (list first, then by id), against a fake agents service,
// so this covers how react-query reports loading for the disabled by-id query.
jest.mock('../../../hooks/use_agent_builder_service');
jest.mock('../../../hooks/use_conversation');
jest.mock('../../../hooks/use_submit_message');
jest.mock('../../../hooks/use_ui_privileges');
jest.mock('../../../hooks/agents/use_agent_model');
jest.mock('../../../hooks/use_current_user');
jest.mock('../../../hooks/use_input_draft');
jest.mock('../../../context/active_space_context');
jest.mock('../../../context/conversation/conversation_context');

const agentWithStarters = {
  id: 'agent-1',
  name: 'Agent',
  conversation_starters: [{ label: 'Top errors', prompt: 'Show me the top errors' }],
};

describe('useConversationStarters with the real agent hooks', () => {
  let queryClient: QueryClient;
  const list = jest.fn();
  const get = jest.fn();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    get.mockResolvedValue(agentWithStarters);
    jest.mocked(useAgentBuilderServices).mockReturnValue({ agentService: { list, get } } as never);
    jest.mocked(useAgentId).mockReturnValue('agent-1');
    jest
      .mocked(useSubmitMessage)
      .mockReturnValue({ submitMessage: jest.fn(), isCreatingConversation: false });
    jest.mocked(useUiPrivileges).mockReturnValue({ invokeBoundAgents: true } as never);
    jest.mocked(useAgentModel).mockReturnValue({ isLoading: false, isLocked: false });
    jest.mocked(useActiveSpaceId).mockReturnValue('default');
    jest.mocked(useConversationContext).mockReturnValue({ sessionTag: 'tag' } as never);
    jest
      .mocked(useCurrentUser)
      .mockReturnValue({ currentUser: { user: { username: 'elastic' } } } as never);
    jest
      .mocked(useCarryOverDraft)
      .mockReturnValue({ takeNewChatDraft: jest.fn(), saveDraftTo: jest.fn() });
  });

  it('shows the starters of an agent found in the agents list', async () => {
    list.mockResolvedValue([agentWithStarters]);

    const { result } = renderHook(() => useConversationStarters(), { wrapper });

    await waitFor(() =>
      expect(result.current.starters).toEqual([
        { label: 'Top errors', prompt: 'Show me the top errors' },
      ])
    );
    // The agent is also fetched by id, as the message input does, to check whether it is bound to a
    // service account.
    expect(get).toHaveBeenCalledWith('agent-1');
  });

  it('shows the starters of an agent that is not in the list, such as a hidden one', async () => {
    list.mockResolvedValue([]);

    const { result } = renderHook(() => useConversationStarters(), { wrapper });

    await waitFor(() =>
      expect(result.current.starters).toEqual([
        { label: 'Top errors', prompt: 'Show me the top errors' },
      ])
    );
    expect(get).toHaveBeenCalledWith('agent-1');
  });

  it('shows nothing for an agent without starters', async () => {
    list.mockResolvedValue([{ id: 'agent-1', name: 'Agent' }]);
    get.mockResolvedValue({ id: 'agent-1', name: 'Agent' });

    const { result } = renderHook(() => useConversationStarters(), { wrapper });

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(result.current.starters).toEqual([]);
  });
});
