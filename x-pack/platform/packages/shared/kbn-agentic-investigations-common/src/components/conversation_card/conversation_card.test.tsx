/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ConversationCard } from './conversation_card';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  worker_execution_ids: ['exec-1'],
  pendingProposalCount: 0,
  assignees: [],
  events: [],
};

const renderCard = (
  isSelected?: boolean,
  onClickCard = jest.fn(),
  renderInFlightStatus?: (inv: Investigation) => React.ReactNode
) => {
  renderWithKibanaRenderContext(
    <ConversationCard
      investigation={investigation}
      isSelected={isSelected}
      onClickCard={onClickCard}
      onClickAction={jest.fn()}
      onCopyLink={jest.fn()}
      onOpenChat={jest.fn()}
      onClickRecommendedAction={jest.fn()}
      renderAssignees={() => null}
      renderInFlightStatus={renderInFlightStatus}
    />
  );
  return { onClickCard };
};

describe('ConversationCard', () => {
  it('renders the in-flight status the page supplies for this investigation', () => {
    renderCard(false, jest.fn(), (inv) => <span>{`Applying ${inv.id}`}</span>);

    expect(screen.getByText('Applying inv-1')).toBeInTheDocument();
  });

  it('emits the conversation id on click so the caller can open the details flyout', () => {
    const { onClickCard } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: investigation.title }));

    expect(onClickCard).toHaveBeenCalledWith('inv-1');
  });

  describe.each([
    { canOpenInvestigationDetails: true, expectedAssignees: 1 },
    { canOpenInvestigationDetails: false, expectedAssignees: 0 },
  ])(
    'with canOpenInvestigationDetails $canOpenInvestigationDetails',
    ({ canOpenInvestigationDetails, expectedAssignees }) => {
      it(`renders ${expectedAssignees} assignee control`, () => {
        renderWithKibanaRenderContext(
          <ConversationCard
            investigation={investigation}
            canOpenInvestigationDetails={canOpenInvestigationDetails}
            onClickCard={jest.fn()}
            onClickAction={jest.fn()}
            onCopyLink={jest.fn()}
            onOpenChat={jest.fn()}
            onClickRecommendedAction={jest.fn()}
            renderAssignees={() => <span>Assignees</span>}
          />
        );

        expect(screen.queryAllByText('Assignees')).toHaveLength(expectedAssignees);
      });
    }
  );

  it('marks the card as current while its flyout is open', () => {
    renderCard(true);

    expect(screen.getByRole('button', { name: investigation.title })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('is not marked as current otherwise', () => {
    renderCard(false);

    expect(screen.getByRole('button', { name: investigation.title })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('ages the card by when the proposal was raised, not when it last changed', () => {
    const createdAt = new Date(Date.now() - 26 * 60 * 1000).toISOString();
    renderWithKibanaRenderContext(
      <ConversationCard
        investigation={{ ...investigation, createdAt }}
        onClickCard={jest.fn()}
        onClickAction={jest.fn()}
        onCopyLink={jest.fn()}
        onOpenChat={jest.fn()}
        onClickRecommendedAction={jest.fn()}
        renderAssignees={() => null}
      />
    );

    expect(screen.getByText('26 minutes ago')).toBeInTheDocument();
  });

  it('gives the exact time on hover, since "26 minutes ago" is not auditable', async () => {
    renderWithKibanaRenderContext(
      <ConversationCard
        investigation={{ ...investigation, createdAt: '2024-03-05T14:30:00.000Z' }}
        onClickCard={jest.fn()}
        onClickAction={jest.fn()}
        onCopyLink={jest.fn()}
        onOpenChat={jest.fn()}
        onClickRecommendedAction={jest.fn()}
        renderAssignees={() => null}
      />
    );

    fireEvent.mouseOver(screen.getByText(/ago$/));

    // Asserted loosely: the exact rendering depends on the runner's locale data and
    // time zone, but the date it names must be the one the proposal was raised on.
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(/2024/));
    expect(screen.getByRole('tooltip')).toHaveTextContent(/March/);
  });
});
