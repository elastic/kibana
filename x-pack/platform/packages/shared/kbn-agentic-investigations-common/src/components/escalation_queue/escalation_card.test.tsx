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
import { EscalationCard } from './escalation_card';

const openEscalation: EscalationQueueItem = {
  id: 'esc-open-1',
  agentId: 'agent-1',
  title: 'Suspicious login from new country',
  status: 'open',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  linkedInvestigationCount: 2,
  assigneeUids: [],
};

const closedEscalation: EscalationQueueItem = {
  ...openEscalation,
  id: 'esc-closed-1',
  status: 'closed',
};

const renderCard = (
  escalation: EscalationQueueItem,
  { onClickCard, href }: { onClickCard?: jest.Mock; href?: string } = {}
) => {
  const renderAssignees = jest.fn(() => <span data-test-subj="assignees-widget" />);
  renderWithKibanaRenderContext(
    <EscalationCard
      escalation={escalation}
      renderAssignees={renderAssignees}
      onClickCard={onClickCard}
      href={href}
    />
  );
  return { renderAssignees };
};

describe('EscalationCard', () => {
  it('renders the escalation title', () => {
    renderCard(openEscalation);
    expect(screen.getByText(openEscalation.title)).toBeInTheDocument();
  });

  describe('link mode (href provided)', () => {
    it('renders the title as a link with the given href', () => {
      renderCard(openEscalation, { href: '/agent-builder/esc-open-1' });

      const link = screen.getByTestId(`escalationCardLink-${openEscalation.id}`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/agent-builder/esc-open-1');
    });

    it('calls onClickCard when the link is clicked (plain click)', () => {
      const onClickCard = jest.fn();
      renderCard(openEscalation, { href: '/agent-builder/esc-open-1', onClickCard });

      fireEvent.click(screen.getByTestId(`escalationCardLink-${openEscalation.id}`));

      expect(onClickCard).toHaveBeenCalledWith(openEscalation);
    });

    it('does not expose the panel as a button when an href is provided', () => {
      renderCard(openEscalation, { href: '/agent-builder/esc-open-1', onClickCard: jest.fn() });

      // EuiPanel renders a <div>; it must not have role="button" when a real link is present.
      const card = screen.getByTestId(`escalationCard-${openEscalation.id}`);
      expect(card).not.toHaveAttribute('role', 'button');
    });
  });

  it('renders the linked-investigations badge when count is positive', () => {
    renderCard(openEscalation);
    // The badge text is the count value
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders "Nothing attached" when linked investigation count is 0', () => {
    renderCard({ ...openEscalation, linkedInvestigationCount: 0 });
    expect(screen.getByText('Nothing attached')).toBeInTheDocument();
  });

  it('calls renderAssignees with the escalation item', () => {
    const { renderAssignees } = renderCard(openEscalation);
    expect(renderAssignees).toHaveBeenCalledWith(openEscalation);
  });

  it('renders the assignee widget slot', () => {
    renderCard(openEscalation);
    expect(screen.getByTestId('assignees-widget')).toBeInTheDocument();
  });

  it('shows a "Closed" badge for closed escalations', () => {
    renderCard(closedEscalation);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('does not show a "Closed" badge for open escalations', () => {
    renderCard(openEscalation);
    // The "Closed" text must not appear anywhere on the card
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });

  it('renders the chevron icon', () => {
    renderCard(openEscalation);
    expect(screen.getByTestId(`escalationCardChevron-${openEscalation.id}`)).toBeInTheDocument();
  });
});
