/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { EscalationQueueItem } from './types';
import { EscalationQueue } from './escalation_queue';

const openItem: EscalationQueueItem = {
  id: 'esc-1',
  title: 'Unusual admin activity',
  status: 'open',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  linkedInvestigationCount: 1,
  assigneeUids: [],
};

const closedItem: EscalationQueueItem = {
  ...openItem,
  id: 'esc-2',
  title: 'Resolved threat',
  status: 'closed',
};

const renderQueue = (status: 'open' | 'closed', escalations: EscalationQueueItem[]) => {
  renderWithKibanaRenderContext(
    <EscalationQueue
      status={status}
      escalations={escalations}
      renderAssignees={() => <span data-testid="assignees" />}
    />
  );
};

describe('EscalationQueue', () => {
  it('renders the section container', () => {
    renderQueue('open', [openItem]);
    expect(screen.getByTestId('escalationQueue-open')).toBeInTheDocument();
  });

  it('shows the "Open" heading for an open queue', () => {
    renderQueue('open', [openItem]);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows the "Closed" heading for a closed queue', () => {
    renderQueue('closed', [closedItem]);
    // The accordion trigger is an <h3>; target the heading role to distinguish from the
    // per-row "Closed" badge that also uses the word "Closed".
    expect(screen.getByRole('heading', { name: 'Closed' })).toBeInTheDocument();
  });

  it('shows the escalation count badge', () => {
    renderQueue('open', [openItem, { ...openItem, id: 'esc-3' }]);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders a card for each escalation', () => {
    renderQueue('open', [openItem, { ...openItem, id: 'esc-3', title: 'Second escalation' }]);
    expect(screen.getByTestId('escalationCard-esc-1')).toBeInTheDocument();
    expect(screen.getByTestId('escalationCard-esc-3')).toBeInTheDocument();
  });

  it('renders "No escalations" when the list is empty', () => {
    renderQueue('open', []);
    expect(screen.getByText('No escalations')).toBeInTheDocument();
  });

  it('shows 0 in the count badge for an empty list', () => {
    renderQueue('closed', []);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows "Show more (N)" when the server total exceeds loaded items', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        totalItemCount={51}
        onLoadMore={jest.fn()}
        renderAssignees={() => <span />}
      />
    );
    // 1 item loaded, 51 total → 50 remaining
    expect(screen.getByTestId('escalationQueueLoadMore-open')).toBeInTheDocument();
    expect(screen.getByText('Show more (50)')).toBeInTheDocument();
  });

  it('calls onLoadMore when the "Show more" button is clicked', () => {
    const onLoadMore = jest.fn();
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        totalItemCount={10}
        onLoadMore={onLoadMore}
        renderAssignees={() => <span />}
      />
    );
    fireEvent.click(screen.getByTestId('escalationQueueLoadMore-open'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides "Show more" when all items are already loaded', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        totalItemCount={1}
        onLoadMore={jest.fn()}
        renderAssignees={() => <span />}
      />
    );
    expect(screen.queryByTestId('escalationQueueLoadMore-open')).not.toBeInTheDocument();
  });
});
