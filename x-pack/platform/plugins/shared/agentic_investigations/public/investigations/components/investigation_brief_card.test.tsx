/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  DEFAULT_CONVERSATION_TITLE,
  type ConversationWithoutRoundsWithPermissions,
} from '@kbn/agent-builder-common';
import {
  conversationToInvestigationSummary,
  InvestigationBriefCard,
} from './investigation_brief_card';

const conversation = {
  id: 'conv-1',
  agent_id: 'nightshift.investigation',
  user: { username: 'elastic' },
  title: 'Checkout latency spike',
  created_at: '2026-07-28T14:00:00.000Z',
  updated_at: '2026-07-28T14:00:00.000Z',
  template_id: 'investigation',
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout is down' },
  permissions: { rename: true, delete: true, update_access_control: true },
} as ConversationWithoutRoundsWithPermissions;

describe('InvestigationBriefCard', () => {
  it('derives a summary from the conversation alone', () => {
    expect(conversationToInvestigationSummary(conversation)).toEqual({
      id: 'conv-1',
      title: 'Checkout latency spike',
      title_pending: false,
      created_at: '2026-07-28T14:00:00.000Z',
      updated_at: '2026-07-28T14:00:00.000Z',
      agent_id: 'nightshift.investigation',
      metadata: { status: 'open', severity: 'critical', summary: 'Checkout is down' },
      in_progress: false,
      subjects: [],
    });
  });

  it('marks a conversation Agent Builder has not titled yet as pending', () => {
    expect(
      conversationToInvestigationSummary({ ...conversation, title: DEFAULT_CONVERSATION_TITLE })
    ).toMatchObject({ title: DEFAULT_CONVERSATION_TITLE, title_pending: true });
  });

  it('fills the card in from the batched loader', async () => {
    const loader = {
      load: jest.fn().mockResolvedValue({
        ...conversationToInvestigationSummary(conversation),
        in_progress: true,
        pending_proposal_count: 1,
      }),
    };

    render(
      <EuiProvider>
        <I18nProvider>
          <QueryClientProvider client={new QueryClient()}>
            <InvestigationBriefCard conversation={conversation} loader={loader} />
          </QueryClientProvider>
        </I18nProvider>
      </EuiProvider>
    );

    expect(screen.getByTestId('investigationCardTitle')).toHaveTextContent(
      'Checkout latency spike'
    );
    await waitFor(() =>
      expect(screen.getByTestId('investigationCardPendingProposals')).toBeInTheDocument()
    );
    expect(screen.getByTestId('investigationCardRunning')).toBeInTheDocument();
    expect(loader.load).toHaveBeenCalledWith('conv-1');
  });
});
