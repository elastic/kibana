/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '../../../common';
import { InvestigationCard } from './investigation_card';

const investigation = (overrides: Partial<InvestigationSummary> = {}): InvestigationSummary => ({
  id: 'conv-1',
  title: 'Checkout latency spike',
  title_pending: false,
  created_at: '2026-07-28T14:00:00.000Z',
  updated_at: '2026-07-28T14:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', severity: 'high', summary: 'Checkout p99 tripled after a deploy.' },
  in_progress: false,
  subjects: [
    {
      type: 'alert',
      id: 'alert-1',
      snapshot: { rule_name: 'Checkout latency' },
      created_at: '2026-07-28T14:00:00.000Z',
    },
    { type: 'alert', id: 'alert-2', created_at: '2026-07-28T14:00:00.000Z' },
  ],
  impact: {
    entities: [
      { id: 'checkout', name: 'checkout' },
      { id: 'cart', name: 'cart' },
      { id: 'payments', name: 'payments' },
      { id: 'search', name: 'search' },
    ],
    created_at: '2026-07-28T14:00:00.000Z',
  },
  pending_proposal_count: 2,
  ...overrides,
});

const renderCard = (props: React.ComponentProps<typeof InvestigationCard>) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationCard {...props} />
      </I18nProvider>
    </EuiProvider>
  );

describe('InvestigationCard', () => {
  it('shows the title, summary, first subject, impacted entities, and pending proposals', () => {
    renderCard({ investigation: investigation() });

    expect(screen.getByTestId('investigationCardTitle')).toHaveTextContent(
      'Checkout latency spike'
    );
    expect(screen.getByTestId('investigationCardSummary')).toHaveTextContent(
      'Checkout p99 tripled after a deploy.'
    );
    expect(screen.getByTestId('investigationCardSubject')).toHaveTextContent('Checkout latency +1');
    expect(screen.getAllByTestId('investigationCardEntity').map((el) => el.textContent)).toEqual([
      'checkout',
      'cart',
      'payments',
    ]);
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByTestId('investigationCardPendingProposals')).toHaveTextContent(
      '2 proposals to review'
    );
    expect(screen.queryByTestId('investigationCardRunning')).not.toBeInTheDocument();
  });

  it('shows the running dot while an agent works on it and leaves out what is missing', () => {
    renderCard({
      investigation: investigation({
        in_progress: true,
        metadata: { status: 'open' },
        subjects: [],
        impact: undefined,
        pending_proposal_count: undefined,
      }),
    });

    expect(screen.getByTestId('investigationCardRunning')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationCardSummary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationCardSubject')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationCardPendingProposals')).not.toBeInTheDocument();
  });

  it.each([
    [
      'the first subject',
      investigation({ title: 'New conversation', title_pending: true }),
      'Checkout latency',
    ],
    [
      "a Slack thread's question rather than its channel",
      investigation({
        title: 'New conversation',
        title_pending: true,
        subjects: [
          {
            type: 'slack_thread',
            id: 'team:T1/channel:C1/thread:1.0',
            summary: 'why is checkout slow?',
            slack: { channel: 'C1', thread_ts: '1.0' },
            created_at: '2026-07-28T14:00:00.000Z',
          },
        ],
      }),
      'why is checkout slow?',
    ],
    [
      'a generic title without a subject',
      investigation({ title: 'New conversation', title_pending: true, subjects: [] }),
      'New investigation',
    ],
  ])('names an investigation Agent Builder has not titled yet after %s', (_, item, expected) => {
    renderCard({ investigation: item });

    expect(screen.getByTestId('investigationCardTitle')).toHaveTextContent(expected);
  });

  it('calls onClick with the investigation on click and on Enter', () => {
    const onClick = jest.fn();
    const item = investigation();
    renderCard({ investigation: item, onClick });

    fireEvent.click(screen.getByTestId('investigationCard'));
    fireEvent.keyDown(screen.getByTestId('investigationCard'), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledWith(item);
  });
});
