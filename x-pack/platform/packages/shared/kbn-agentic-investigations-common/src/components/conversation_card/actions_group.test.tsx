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
  const onOpenChat = jest.fn();

  renderWithKibanaRenderContext(
    <ConversationsActionsGroup
      investigation={investigation}
      onClickRecommendedAction={withRecommendedAction ? onClickRecommendedAction : undefined}
      onClickAction={onClickAction}
      onOpenChat={onOpenChat}
    />
  );

  return { onClickRecommendedAction, onClickAction, onOpenChat };
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Open actions menu' }));

describe('ConversationsActionsGroup', () => {
  describe('on the card', () => {
    it('offers opening the chat, which is navigation rather than a decision', () => {
      const { onOpenChat } = renderGroup(makeInvestigation());

      fireEvent.click(screen.getByRole('button', { name: 'Open in chat' }));

      expect(onOpenChat).toHaveBeenCalled();
    });

    it('does not put the recommended action on the card', () => {
      renderGroup(makeInvestigation());

      // The decision lives in the menu, so the card cannot submit one by mis-click.
      expect(screen.queryByRole('button', { name: 'Revoke sessions' })).not.toBeInTheDocument();
    });

    it('keeps opening the chat available on a decided investigation', () => {
      const { onOpenChat } = renderGroup(makeInvestigation({ recommendedAction: 'closed' }));

      fireEvent.click(screen.getByRole('button', { name: 'Open in chat' }));

      expect(onOpenChat).toHaveBeenCalled();
    });
  });

  describe('in the menu', () => {
    it('offers the recommended action while a decision is still open', () => {
      const { onClickRecommendedAction } = renderGroup(makeInvestigation());
      openMenu();

      fireEvent.click(screen.getByText('Revoke sessions'));

      expect(onClickRecommendedAction).toHaveBeenCalledWith({ id: 'inv-1' });
    });

    it('labels an action-less proposal with the generic fallback', () => {
      renderGroup(makeInvestigation({ primaryActionLabel: undefined }));
      openMenu();

      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('omits the recommended action on a decided investigation', () => {
      // A decided proposal sits in the Closed bucket. Approving it again submits a
      // decision the API refuses, so the item must not be there to click.
      renderGroup(makeInvestigation({ recommendedAction: 'closed' }));
      openMenu();

      expect(screen.queryByText('Revoke sessions')).not.toBeInTheDocument();
    });

    it('omits the recommended action when no handler is wired', () => {
      renderGroup(makeInvestigation(), { withRecommendedAction: false });
      openMenu();

      expect(screen.queryByText('Revoke sessions')).not.toBeInTheDocument();
    });

    it('no longer duplicates opening the chat, which is on the card', () => {
      renderGroup(makeInvestigation());
      openMenu();

      expect(screen.queryByText('Open in chat')).not.toBeInTheDocument();
    });

    it('drops assign and close on a decided investigation', () => {
      renderGroup(makeInvestigation({ recommendedAction: 'closed' }));
      openMenu();

      expect(screen.queryByText('Assign')).not.toBeInTheDocument();
      expect(screen.queryByText('Close investigation')).not.toBeInTheDocument();
    });

    it('keeps the read-only items on a decided investigation', () => {
      renderGroup(makeInvestigation({ recommendedAction: 'closed' }));
      openMenu();

      expect(screen.getByText('Open an escalation')).toBeInTheDocument();
    });

    it('keeps assign and close while the decision is open', () => {
      const { onClickAction } = renderGroup(makeInvestigation());
      openMenu();

      fireEvent.click(screen.getByText('Close investigation'));

      expect(onClickAction).toHaveBeenCalledWith('close', 'inv-1');
    });
  });
});
