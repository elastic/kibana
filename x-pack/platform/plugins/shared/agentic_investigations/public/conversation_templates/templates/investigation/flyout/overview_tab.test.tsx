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
import type { Conversation } from '@kbn/agent-builder-common';
import { createFlyoutGroupedAttachmentsRegistry } from '@kbn/agentic-investigations-common';
import type { Investigation } from '../../../../../common';
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

const renderOverview = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationOverview
          conversation={conversation}
          groupedAttachments={groupedAttachments}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('InvestigationOverview', () => {
  it('renders the subjects, what happened, impact, conclusion, and trace from the query API', () => {
    mockUseInvestigation.mockReturnValue({ data: investigation });

    renderOverview();

    expect(screen.getByText('Why is checkout slow?')).toBeInTheDocument();
    expect(screen.getByText('Checkout p99 tripled.')).toBeInTheDocument();
    expect(screen.getByText('Checkout is degraded')).toBeInTheDocument();
    expect(screen.getByText('A bad deploy.')).toBeInTheDocument();
    expect(screen.getByText('Bad deploy')).toBeInTheDocument();
  });

  it('falls back to the conversation when the investigation cannot be read', () => {
    mockUseInvestigation.mockReturnValue({ data: undefined });

    renderOverview();

    expect(screen.getByText('From the conversation')).toBeInTheDocument();
    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Investigation trace')).not.toBeInTheDocument();
  });
});
