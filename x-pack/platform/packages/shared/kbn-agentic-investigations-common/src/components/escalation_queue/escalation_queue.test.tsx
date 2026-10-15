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
  agentId: 'agent-1',
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

  it('counts the matching rows in the badge while filtered, with "+" when more can load', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        loadedCount={3}
        totalItemCount={5}
        isFiltered
        renderAssignees={() => <span />}
      />
    );
    expect(screen.getByText('1+')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
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

  it('renders "Show more" as the sibling after the last card, so the card keeps its divider', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        totalItemCount={51}
        onLoadMore={jest.fn()}
        renderAssignees={() => <span />}
      />
    );

    let footer: HTMLElement = screen.getByTestId('escalationQueueLoadMore-open');
    while (footer.parentElement && !footer.previousElementSibling) {
      footer = footer.parentElement;
    }

    expect(footer.previousElementSibling).toHaveTextContent(openItem.title);
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

  it('passes the href from getHref to each card', () => {
    const getHref = jest.fn((e: EscalationQueueItem) => `/chat/${e.id}`);
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        onClickCard={jest.fn()}
        getHref={getHref}
        renderAssignees={() => <span />}
      />
    );

    expect(getHref).toHaveBeenCalledWith(openItem);
    const link = screen.getByTestId(`escalationCardLink-${openItem.id}`);
    expect(link).toHaveAttribute('href', `/chat/${openItem.id}`);
  });

  it('shows the filtered empty-state copy when an Impact filter hides every row', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue status="open" escalations={[]} isFiltered renderAssignees={() => <span />} />
    );
    expect(screen.getByText('No escalations match the current filter.')).toBeInTheDocument();
  });

  it('computes "Show more" from the unfiltered loaded count', () => {
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="open"
        escalations={[openItem]}
        loadedCount={3}
        totalItemCount={5}
        isFiltered
        onLoadMore={jest.fn()}
        renderAssignees={() => <span />}
      />
    );
    expect(screen.getByTestId('escalationQueueLoadMore-open')).toHaveTextContent('2');
  });

  it('keeps "Show more" available when the filter hides every loaded row', () => {
    const onLoadMore = jest.fn();
    renderWithKibanaRenderContext(
      <EscalationQueue
        status="closed"
        escalations={[]}
        loadedCount={10}
        totalItemCount={15}
        isFiltered
        onLoadMore={onLoadMore}
        renderAssignees={() => <span />}
      />
    );
    expect(screen.getByText('No escalations match the current filter.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('escalationQueueLoadMore-closed'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
