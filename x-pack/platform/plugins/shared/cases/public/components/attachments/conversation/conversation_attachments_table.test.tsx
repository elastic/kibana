/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '../../../types';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { buildCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import { basicCase } from '../../../containers/mock';
import { useDeleteComment } from '../../../containers/use_delete_comment';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import { ConversationAttachmentsTable } from './conversation_attachments_table';
import { useAgentBuilderAgents } from './use_agent_builder_agents';

jest.mock('./use_agent_builder_agents');
jest.mock('../../../containers/use_delete_comment');

const useAgentBuilderAgentsMock = useAgentBuilderAgents as jest.Mock;
const useDeleteCommentMock = useDeleteComment as jest.Mock;

const conversationAttachment = (id: string, conversationId: string, title: string) =>
  ({
    id,
    type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    attachmentId: conversationId,
    metadata: { title, agentId: 'agent-1' },
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: { username: 'alice', fullName: 'Alice A' },
  } as unknown as AttachmentUIV2);

const caseWith = (comments: AttachmentUIV2[]): CaseUI => ({ ...basicCase, comments } as CaseUI);

describe('ConversationAttachmentsTable', () => {
  const openChat = jest.fn();
  const services = {
    agentBuilder: { openChat },
  } as unknown as CasesPublicStartDependencies;
  const coreStart = createStartServicesMock() as unknown as CoreStart;
  (coreStart.application.getUrlForApp as jest.Mock).mockImplementation(
    (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
  );
  const caseData = caseWith([
    conversationAttachment('c1', 'conv-1', 'Suspicious login'),
    conversationAttachment('c2', 'conv-2', 'Latency regression'),
    basicCase.comments[0],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    useAgentBuilderAgentsMock.mockReturnValue({
      agents: [],
      nameById: new Map([['agent-1', 'Security agent']]),
    });
    useDeleteCommentMock.mockReturnValue({ isLoading: false, mutate: jest.fn() });
  });

  it('renders one row per conversation attachment with the agent name', () => {
    renderWithTestingProviders(<ConversationAttachmentsTable caseData={caseData} />, {
      wrapperProps: { services },
    });

    expect(screen.getByTestId('cases-conversation-attachments-table-link-c1')).toHaveTextContent(
      'Suspicious login'
    );
    expect(screen.getByTestId('cases-conversation-attachments-table-link-c2')).toBeInTheDocument();
    expect(screen.getAllByText('Security agent')).toHaveLength(2);
    expect(screen.getAllByText('Alice A')).toHaveLength(2);
  });

  it('opens the conversation in chat from the title and in full page from the action', async () => {
    renderWithTestingProviders(<ConversationAttachmentsTable caseData={caseData} />, {
      wrapperProps: { services, coreStart },
    });

    await userEvent.click(screen.getByTestId('cases-conversation-attachments-table-link-c1'));
    expect(openChat).toHaveBeenCalledWith({ conversationId: 'conv-1', agentId: 'agent-1' });
    expect(screen.getByTestId('cases-conversation-attachments-table-open-c1')).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/agent-1/conversations/conv-1'
    );
  });

  it('filters rows by the search term', () => {
    renderWithTestingProviders(
      <ConversationAttachmentsTable caseData={caseData} searchTerm="latency" />,
      { wrapperProps: { services } }
    );

    expect(screen.queryByTestId('cases-conversation-attachments-table-link-c1')).toBeNull();
    expect(screen.getByTestId('cases-conversation-attachments-table-link-c2')).toBeInTheDocument();
  });

  it('shows the delete action only with the delete privilege', () => {
    const { unmount } = renderWithTestingProviders(
      <ConversationAttachmentsTable caseData={caseData} />,
      { wrapperProps: { services } }
    );
    expect(screen.getByTestId('cases-so-attachments-table-delete-c1')).toBeInTheDocument();
    unmount();

    renderWithTestingProviders(<ConversationAttachmentsTable caseData={caseData} />, {
      wrapperProps: { services, permissions: buildCasesPermissions({ delete: false }) },
    });
    expect(screen.queryByTestId('cases-so-attachments-table-delete-c1')).toBeNull();
  });

  it('renders the empty state without conversation attachments', () => {
    renderWithTestingProviders(
      <ConversationAttachmentsTable caseData={caseWith([basicCase.comments[0]])} />,
      { wrapperProps: { services } }
    );
    expect(screen.getByTestId('cases-conversation-attachments-table-empty')).toBeInTheDocument();
  });
});
