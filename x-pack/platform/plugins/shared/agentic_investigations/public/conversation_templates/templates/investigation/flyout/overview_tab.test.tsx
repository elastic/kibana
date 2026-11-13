/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import type { Conversation } from '@kbn/agent-builder-common';
import { createFlyoutGroupedAttachmentsRegistry } from '@kbn/agentic-investigations-common';
import type { Investigation, InvestigationProposalSummary } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { InvestigationOverview } from './overview_tab';

jest.mock('../../../../investigations/hooks/use_investigation');
jest.mock('../../../../evidence/evidence_view', () => ({
  EvidenceView: () => <div data-test-subj="evidenceView" />,
}));
const mockUseInvestigation = useInvestigation as jest.Mock;

const conversation = {
  id: 'conv-1',
  agent_id: 'nightshift.investigation',
  user: { username: 'elastic' },
  title: 'Checkout latency spike',
  created_at: '2026-07-28T14:00:00.000Z',
  updated_at: '2026-07-28T14:00:00.000Z',
  rounds: [],
  template_id: 'investigation',
  metadata: { status: 'open', summary: 'From the conversation' },
} as Conversation;

const groupedAttachments = createFlyoutGroupedAttachmentsRegistry();

const investigation: Investigation = {
  id: 'conv-1',
  title: 'Checkout latency spike',
  title_pending: false,
  created_at: '2026-07-28T14:00:00.000Z',
  updated_at: '2026-07-28T14:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', summary: 'Checkout p99 tripled.', verdict: 'A bad deploy.' },
  in_progress: false,
  subjects: [{ type: 'manual', id: 'conv-1', summary: 'Why is checkout slow?', created_at: 'x' }],
  impact: {
    summary: 'Checkout is degraded',
    entities: [{ id: 'checkout', name: 'checkout' }],
    created_at: 'x',
  },
  hypotheses: {
    hypotheses: [{ candidate: 'Bad deploy', confidence: 0.9, status: 'confirmed' }],
    created_at: 'x',
  },
  proposals: [],
};

const overviewElement = (overviewConversation: Conversation, queryClient: QueryClient) => (
  <EuiProvider>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <InvestigationOverview
          conversation={conversation}
          groupedAttachments={groupedAttachments}
        />
      </QueryClientProvider>
    </I18nProvider>
  </EuiProvider>
);

const renderOverview = (
  overviewConversation: Conversation = conversation,
  queryClient: QueryClient = new QueryClient()
) => render(overviewElement(overviewConversation, queryClient));

describe('InvestigationOverview', () => {
  it('renders the subjects, what happened, impact, conclusion, and hypothesis tree from the query API', () => {
    mockUseInvestigation.mockReturnValue({ data: investigation });

    renderOverview();

    expect(screen.getByText('Why is checkout slow?')).toBeInTheDocument();
    expect(screen.getByText('Checkout p99 tripled.')).toBeInTheDocument();
    expect(screen.getByText('Checkout is degraded')).toBeInTheDocument();
    expect(screen.getByText('A bad deploy.')).toBeInTheDocument();
    // The tree card replaces the hypotheses list.
    expect(screen.queryByTestId('investigationHypotheses')).not.toBeInTheDocument();
    expect(screen.getByTestId('investigationHypothesisTreeButton')).toHaveTextContent(
      '1 hypothesis analyzed'
    );
  });

  it('leaves the hypothesis tree out without hypotheses', () => {
    mockUseInvestigation.mockReturnValue({ data: { ...investigation, hypotheses: undefined } });

    renderOverview();

    expect(screen.queryByTestId('investigationHypothesisTreeButton')).not.toBeInTheDocument();
  });

  it('falls back to the conversation when the investigation cannot be read', () => {
    mockUseInvestigation.mockReturnValue({ data: undefined });

    renderOverview();

    expect(screen.getByText('From the conversation')).toBeInTheDocument();
    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationHypothesisTreeButton')).not.toBeInTheDocument();
  });

  describe('proposed actions refresh', () => {
    const proposal: InvestigationProposalSummary = {
      id: 'proposal-1',
      title: 'Review the rule by hand',
      comment: 'No safe exception was found.',
      status: 'pending',
      impact: 'low',
      confidence: 'high',
      created_at: 'x',
    };

    const withProposals = (proposals?: InvestigationProposalSummary[]) => ({
      data: proposals && { ...investigation, hypotheses: undefined, proposals },
    });

    const renderAndPoll = (initial?: InvestigationProposalSummary[]) => {
      const queryClient = new QueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      mockUseInvestigation.mockReturnValue(withProposals(initial));
      const { rerender } = renderOverview(conversation, queryClient);
      const poll = (next?: InvestigationProposalSummary[]) => {
        mockUseInvestigation.mockReturnValue(withProposals(next));
        rerender(overviewElement(conversation, queryClient));
      };
      return { invalidateQueries, poll };
    };

    it('should refetch the proposed actions list when the investigation shows a new proposal', () => {
      const { invalidateQueries, poll } = renderAndPoll([]);

      poll([proposal]);

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith(
        { queryKey: platformQueryKeys.proposals.forConversation('conv-1') },
        { cancelRefetch: false }
      );
    });

    it('should refetch the proposed actions list when a proposal changes status', () => {
      const { invalidateQueries, poll } = renderAndPoll([proposal]);

      poll([{ ...proposal, status: 'no_action' }]);

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
    });

    it('should not refetch the proposed actions list when the proposals are unchanged', () => {
      const { invalidateQueries, poll } = renderAndPoll([proposal]);

      poll([{ ...proposal }]);

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it('should not refetch the proposed actions list when the first investigation read arrives', () => {
      const { invalidateQueries, poll } = renderAndPoll(undefined);

      poll([proposal]);

      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
