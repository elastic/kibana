/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { waitFor, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  renderWithTestingProviders,
} from '../../../common/mock';
import { AlertPropertyActions } from './alert_property_actions';

describe('AlertPropertyActions', () => {
  let user: UserEvent;

  const props = {
    isLoading: false,
    totalAlerts: 1,
    onDelete: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
  });

  it('renders the correct number of actions', async () => {
    renderWithTestingProviders(<AlertPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await user.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect((await screen.findAllByTestId('property-actions-user-action-group')).length).toBe(1);

    expect(
      await screen.findByTestId('property-actions-user-action-minusInCircle')
    ).toBeInTheDocument();
  });

  it('renders the modal info correctly for multiple alert', async () => {
    renderWithTestingProviders(<AlertPropertyActions {...props} totalAlerts={2} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await user.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    await user.click(await screen.findByTestId('property-actions-user-action-minusInCircle'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    expect(await screen.findByTestId('confirmModalTitleText')).toHaveTextContent('Remove alerts');
    expect(await screen.findByText('Remove')).toBeInTheDocument();
  });

  it('remove alerts correctly', async () => {
    renderWithTestingProviders(<AlertPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await user.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    await user.click(await screen.findByTestId('property-actions-user-action-minusInCircle'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    await user.click(await screen.findByText('Remove'));

    await waitFor(() => {
      expect(props.onDelete).toHaveBeenCalled();
    });
  });

  it('does not show the property actions without delete permissions', async () => {
    renderWithTestingProviders(<AlertPropertyActions {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    renderWithTestingProviders(<AlertPropertyActions {...props} />, {
      wrapperProps: { permissions: onlyDeleteCasesPermission() },
    });

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();
  });
});
