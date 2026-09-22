/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import type { Investigation } from '../../types';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  recordId: 'CASE-2047',
  conversationAssignees: ['ava'],
  pendingProposalCount: 0,
  events: [],
};

const openActionsMenu = () => {
  fireEvent.click(screen.getByTestId('investigationFlyoutActions-button'));
};

describe('ConversationDetailsFlyoutFooter', () => {
  it('calls the supplied onOpenChat rather than reaching for Kibana services', () => {
    const onOpenChat = jest.fn();

    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={onOpenChat} />
    );

    fireEvent.click(screen.getByTestId('investigationFlyoutOpenChat'));

    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('owns the assign modal, so it opens without a page-level host', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={jest.fn()} />
    );

    openActionsMenu();
    fireEvent.click(screen.getByText('Assign'));

    expect(screen.getByText('Assign proposal')).toBeInTheDocument();
  });

  const submitAssignment = () => {
    openActionsMenu();
    fireEvent.click(screen.getByText('Assign'));

    // Select an assignee and enter a rationale so the Assign button becomes enabled.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ava' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'on-call rotation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
  };

  it('hands onAssignSubmit the rationale the modal collected, not just the assignee', async () => {
    const onAssignSubmit = jest.fn().mockResolvedValue(undefined);

    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        onOpenChat={jest.fn()}
        onAssignSubmit={onAssignSubmit}
      />
    );

    submitAssignment();

    expect(onAssignSubmit).toHaveBeenCalledWith('ava', 'on-call rotation');
    await waitForElementToBeRemoved(() => screen.queryByText('Assign proposal'));
  });

  it('keeps the modal open when the write fails, so the assignment can be retried', async () => {
    const onAssignSubmit = jest.fn().mockRejectedValue(new Error('boom'));

    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter
        investigation={investigation}
        onOpenChat={jest.fn()}
        onAssignSubmit={onAssignSubmit}
      />
    );

    submitAssignment();

    await waitFor(() => expect(onAssignSubmit).toHaveBeenCalled());
    expect(screen.getByText('Assign proposal')).toBeInTheDocument();
  });

  it('owns the close investigation modal', () => {
    renderWithKibanaRenderContext(
      <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={jest.fn()} />
    );

    openActionsMenu();
    fireEvent.click(screen.getByText('Close investigation'));

    expect(screen.getByText('Dismiss proposal')).toBeInTheDocument();
  });
});
