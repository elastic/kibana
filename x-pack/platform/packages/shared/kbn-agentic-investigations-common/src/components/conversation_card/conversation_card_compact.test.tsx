/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ConversationCardCompact } from './conversation_card_compact';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Compromised API key — billing-svc',
  createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  recommendedAction: 'closed',
  primaryActionLabel: 'Rotate the Stripe key',
  summary: 'A summary the compact row deliberately leaves out.',
  events: [],
};

const renderRow = (props: Partial<React.ComponentProps<typeof ConversationCardCompact>> = {}) => {
  const onClickCard = jest.fn();
  renderWithKibanaRenderContext(
    <ConversationCardCompact
      investigation={investigation}
      hasBorder={false}
      outcome="Approved by Maya Chen"
      onClickCard={onClickCard}
      onClickAction={jest.fn()}
      onOpenChat={jest.fn()}
      onClickRecommendedAction={jest.fn()}
      {...props}
    />
  );
  return { onClickCard };
};

describe('ConversationCardCompact', () => {
  it('puts the age, the title, the action and the outcome on one line', () => {
    renderRow();

    const row = screen.getByRole('button', { name: investigation.title });
    expect(row).toHaveTextContent('4 hours ago');
    expect(row).toHaveTextContent(investigation.title);
    expect(row).toHaveTextContent('Rotate the Stripe key');
    expect(row).toHaveTextContent('Approved by Maya Chen');
  });

  it('leaves the summary out, which is what makes it compact', () => {
    renderRow();

    expect(screen.queryByText(investigation.summary!)).not.toBeInTheDocument();
  });

  it('offers no decision, since the row is already decided', () => {
    renderRow();

    // A decided row with no escalation capability has no available actions — the trigger
    // must not render at all rather than opening an empty popover.
    expect(screen.queryByRole('button', { name: 'Open actions menu' })).not.toBeInTheDocument();
  });

  it('still opens the flyout on click', () => {
    const { onClickCard } = renderRow();

    fireEvent.click(screen.getByRole('button', { name: investigation.title }));

    expect(onClickCard).toHaveBeenCalledWith('inv-1');
  });

  it('opens the flyout from the keyboard', () => {
    const { onClickCard } = renderRow();

    fireEvent.keyDown(screen.getByRole('button', { name: investigation.title }), { key: 'Enter' });

    expect(onClickCard).toHaveBeenCalledWith('inv-1');
  });

  it('leaves the keyboard to the nested controls, which the row would otherwise swallow', () => {
    const { onClickCard } = renderRow();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open in chat' }), { key: 'Enter' });

    expect(onClickCard).not.toHaveBeenCalled();
  });
});
