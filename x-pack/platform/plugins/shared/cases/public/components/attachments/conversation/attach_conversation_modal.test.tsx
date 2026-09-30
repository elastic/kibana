/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import { AttachConversationModal } from './attach_conversation_modal';
import { useFindConversations, type FoundConversation } from './use_find_conversations';
import { useAttachConversation } from './use_attach_conversation';
import { useAgentBuilderAgents } from './use_agent_builder_agents';

jest.mock('./use_find_conversations');
jest.mock('./use_attach_conversation');
jest.mock('./use_agent_builder_agents');

const useFindConversationsMock = useFindConversations as jest.Mock;
const useAttachConversationMock = useAttachConversation as jest.Mock;
const useAgentBuilderAgentsMock = useAgentBuilderAgents as jest.Mock;

const conversation = (id: string, title: string, accessMode?: 'public' | 'private') =>
  ({
    id,
    title,
    agent_id: 'agent-1',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...(accessMode ? { access_control: { access_mode: accessMode, entries: [] } } : {}),
  } as unknown as FoundConversation);

const items = [
  conversation('conv-1', 'Suspicious login', 'public'),
  conversation('conv-2', 'Latency'),
];

const findResult = (overrides: Partial<ReturnType<typeof useFindConversations>> = {}) => ({
  items,
  total: items.length,
  pageCount: 1,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

describe('AttachConversationModal', () => {
  const attach = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useFindConversationsMock.mockReturnValue(findResult());
    useAttachConversationMock.mockReturnValue({ attach, attachingId: null, isAttaching: false });
    useAgentBuilderAgentsMock.mockReturnValue({
      agents: [{ id: 'agent-1', name: 'Security agent' }],
      nameById: new Map([['agent-1', 'Security agent']]),
    });
  });

  const renderModal = (caseData: CaseUI = basicCase) =>
    renderWithTestingProviders(<AttachConversationModal caseData={caseData} onClose={onClose} />);

  it('lists conversations with agent name and visibility', () => {
    renderModal();

    expect(screen.getByTestId('cases-attach-conversation-card-conv-1')).toHaveTextContent(
      'Suspicious login'
    );
    expect(screen.getByTestId('cases-attach-conversation-card-conv-1')).toHaveTextContent(
      'Security agent'
    );
    expect(screen.getAllByTestId('cases-attach-conversation-visibility')[0]).toHaveTextContent(
      'Public'
    );
    expect(screen.getAllByTestId('cases-attach-conversation-visibility')[1]).toHaveTextContent(
      'Private'
    );
  });

  it('attaches a conversation and marks the row as attached', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('cases-attach-conversation-button-conv-1'));

    expect(attach).toHaveBeenCalledWith(items[0]);
    await waitFor(() =>
      expect(screen.getByTestId('cases-attach-conversation-button-conv-1')).toBeDisabled()
    );
    expect(screen.getByTestId('cases-attach-conversation-button-conv-1')).toHaveTextContent(
      'Attached'
    );
  });

  it('marks conversations already on the case as attached', () => {
    renderModal({
      ...basicCase,
      comments: [
        {
          id: 'c1',
          type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
          attachmentId: 'conv-2',
        } as unknown as AttachmentUIV2,
      ],
    } as CaseUI);

    expect(screen.getByTestId('cases-attach-conversation-button-conv-2')).toBeDisabled();
    expect(screen.getByTestId('cases-attach-conversation-button-conv-1')).toBeEnabled();
  });

  it('filters by agent and passes the search term to the finder', async () => {
    renderModal();

    await userEvent.selectOptions(
      screen.getByTestId('cases-attach-conversation-agent-select'),
      'agent-1'
    );
    await userEvent.type(screen.getByTestId('cases-attach-conversation-search'), 'login');

    await waitFor(() =>
      expect(useFindConversationsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'login', agentId: 'agent-1', page: 0 })
      )
    );
  });

  it('shows the loading state', () => {
    useFindConversationsMock.mockReturnValue(findResult({ items: [], isLoading: true }));
    renderModal();
    expect(screen.getByTestId('cases-attach-conversation-loading')).toBeInTheDocument();
  });

  it('shows the first-time empty state when the user has no conversations', () => {
    useFindConversationsMock.mockReturnValue(findResult({ items: [], total: 0 }));
    renderModal();
    expect(screen.getByTestId('cases-attach-conversation-empty')).toHaveTextContent(
      'No conversations yet'
    );
  });

  it('shows the no-results state when a search matches nothing', async () => {
    renderModal();
    await userEvent.type(screen.getByTestId('cases-attach-conversation-search'), 'zzz');
    useFindConversationsMock.mockReturnValue(findResult({ items: [], total: 0 }));

    await waitFor(() =>
      expect(screen.getByTestId('cases-attach-conversation-empty')).toHaveTextContent(
        'No conversations found'
      )
    );
  });

  it('shows the error state and retries', async () => {
    const refetch = jest.fn();
    useFindConversationsMock.mockReturnValue(findResult({ items: [], isError: true, refetch }));
    renderModal();

    expect(screen.getByTestId('cases-attach-conversation-error')).toHaveTextContent(
      "Conversations couldn't be loaded"
    );
    await userEvent.click(screen.getByTestId('cases-attach-conversation-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});
