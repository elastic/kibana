/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';

import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  renderWithTestingProviders,
} from '../../../common/mock';
import { UserCommentPropertyActions } from './user_comment_property_actions';
import { screen } from '@testing-library/react';

describe('UserCommentPropertyActions', () => {
  const props = {
    isLoading: false,
    onEdit: jest.fn(),
    onQuote: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('property-actions-user-action-pencil')).toBeInTheDocument();
    expect(screen.getByTestId('property-actions-user-action-trash')).toBeInTheDocument();
    expect(screen.getByTestId('property-actions-user-action-quote')).toBeInTheDocument();
  });

  it('edits the comment correctly', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('property-actions-user-action-pencil')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-pencil'));

    expect(props.onEdit).toHaveBeenCalled();
  });

  it('quotes the comment correctly', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('property-actions-user-action-quote')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-quote'));

    expect(props.onQuote).toHaveBeenCalled();
  });

  it('deletes the comment correctly', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-trash'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('Delete'));
    expect(props.onDelete).toHaveBeenCalled();
  });

  it('does not show the property actions without delete permissions', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    renderWithTestingProviders(<UserCommentPropertyActions {...props} />, {
      wrapperProps: { permissions: onlyDeleteCasesPermission() },
    });

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();
  });
});
