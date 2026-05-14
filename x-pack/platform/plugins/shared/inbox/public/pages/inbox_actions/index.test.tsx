/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InboxAction } from '@kbn/inbox-common';
import { InboxActionsPage } from '.';
import { createStubInboxAction } from '../../../common/test_helpers';

jest.mock('./components/respond_flyout', () => ({
  RespondFlyout: () => <div data-test-subj="respond-flyout-mock" />,
}));

jest.mock('../../hooks/use_inbox_api');

const { useInboxActions } = jest.requireMock('../../hooks/use_inbox_api') as {
  useInboxActions: jest.MockedFunction<
    (params: unknown) => { data: unknown; isLoading: boolean; error: unknown; refetch: jest.Mock }
  >;
};

const defaultResult = {
  data: { actions: [] as InboxAction[], total: 0 },
  error: null,
  isLoading: false,
  refetch: jest.fn(),
};

describe('InboxActionsPage', () => {
  beforeEach(() => {
    useInboxActions.mockReturnValue(defaultResult);
  });

  it('renders the page title', () => {
    render(<InboxActionsPage />);

    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
  });

  it('renders the page description', () => {
    render(<InboxActionsPage />);

    expect(
      screen.getByText(/Review and action items that agents across Kibana/)
    ).toBeInTheDocument();
  });

  it('renders the table (not the empty prompt) while loading', () => {
    useInboxActions.mockReturnValue({ ...defaultResult, data: undefined, isLoading: true });

    render(<InboxActionsPage />);

    expect(screen.queryByText('No inbox actions')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders the error empty prompt when loading fails', () => {
    useInboxActions.mockReturnValue({
      ...defaultResult,
      data: undefined,
      error: new Error('Network error'),
    });

    render(<InboxActionsPage />);

    expect(screen.getByText('Unable to load inbox actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders the empty state when there are no actions', () => {
    render(<InboxActionsPage />);

    expect(screen.getByText('No inbox actions')).toBeInTheDocument();
  });

  it('renders one row per action', () => {
    const actions = [
      createStubInboxAction({ id: 'r1', title: 'Approve database migration' }),
      createStubInboxAction({ id: 'r2', title: 'Allow script execution' }),
      createStubInboxAction({ id: 'r3', title: 'Confirm alert suppression' }),
    ];

    useInboxActions.mockReturnValue({ ...defaultResult, data: { actions, total: 3 } });

    render(<InboxActionsPage />);

    for (const action of actions) {
      expect(screen.getByText(action.title)).toBeInTheDocument();
    }
  });

  it('enables the respond button only for pending actions', () => {
    const actions = [
      createStubInboxAction({ id: 'a1', status: 'pending', title: 'Pending action' }),
      createStubInboxAction({ id: 'a2', status: 'approved', title: 'Approved action' }),
    ];

    useInboxActions.mockReturnValue({ ...defaultResult, data: { actions, total: 2 } });

    render(<InboxActionsPage />);

    const respondButtons = screen.getAllByTestId('inboxActionRespondButton');

    expect(respondButtons).toHaveLength(2);
    expect(respondButtons[0]).not.toBeDisabled();
    expect(respondButtons[1]).toBeDisabled();
  });
});
