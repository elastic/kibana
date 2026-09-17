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
import { ConversationsActionsGroup } from './actions_group';

const makeInvestigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  recordId: 'inv-1',
  pendingProposalCount: 1,
  recommendedAction: 'respond',
  primaryActionLabel: 'Revoke sessions',
  events: [],
  ...overrides,
});

const renderGroup = (
  investigation: Investigation,
  { withRecommendedAction = true }: { withRecommendedAction?: boolean } = {}
) => {
  const onClickRecommendedAction = jest.fn();
  const onClickAction = jest.fn();

  renderWithKibanaRenderContext(
    <ConversationsActionsGroup
      investigation={investigation}
      onClickRecommendedAction={withRecommendedAction ? onClickRecommendedAction : undefined}
      onClickAction={onClickAction}
      onOpenChat={jest.fn()}
    />
  );

  return { onClickRecommendedAction, onClickAction };
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));

describe('ConversationsActionsGroup', () => {
  it('offers the recommended action while a decision is still open', () => {
    const { onClickRecommendedAction } = renderGroup(makeInvestigation());

    fireEvent.click(screen.getByRole('button', { name: 'Revoke sessions' }));

    expect(onClickRecommendedAction).toHaveBeenCalledWith({ id: 'inv-1' });
  });

  it('hides the call to action on a decided investigation', () => {
    // A decided proposal sits in the Closed bucket. Approving it again submits a
    // decision the API refuses, so the button must not be there to click.
    renderGroup(makeInvestigation({ recommendedAction: 'closed' }));

    expect(screen.queryByRole('button', { name: 'Revoke sessions' })).not.toBeInTheDocument();
  });

  it('hides the call to action when no handler is wired, rather than rendering a dead button', () => {
    renderGroup(makeInvestigation(), { withRecommendedAction: false });

    expect(screen.queryByRole('button', { name: 'Revoke sessions' })).not.toBeInTheDocument();
  });

  it('drops assign and dismiss from the menu on a decided investigation', () => {
    renderGroup(makeInvestigation({ recommendedAction: 'closed' }));
    openMenu();

    expect(screen.queryByText('Assign')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  it('keeps the read-only menu items on a decided investigation', () => {
    renderGroup(makeInvestigation({ recommendedAction: 'closed' }));
    openMenu();

    expect(screen.getByText('Open an incident')).toBeInTheDocument();
  });

  it('keeps assign and dismiss while the decision is open', () => {
    const { onClickAction } = renderGroup(makeInvestigation());
    openMenu();

    fireEvent.click(screen.getByText('Dismiss'));

    expect(onClickAction).toHaveBeenCalledWith('dismiss', 'inv-1');
  });
});
