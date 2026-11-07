/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createErrorToastServices, openErrorDetails } from '../test_helpers/error_toast_services';
import { notifyRequestError, showErrorToast } from './error_details';

describe('showErrorToast', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("shows a danger toast with EUI's action, which stays up as long as core's error toasts", () => {
    const mocks = createErrorToastServices();

    showErrorToast(mocks.services, {
      title: 'Unable to delete boost rule "catalogs"',
      details: <p>Details</p>,
      onRetry: jest.fn(),
    });

    expect(mocks.uiSettings.get).toHaveBeenCalledWith('notifications:lifetime:error');
    expect(mocks.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unable to delete boost rule "catalogs"',
        text: undefined,
        actionProps: { primary: expect.objectContaining({ children: 'View details' }) },
      }),
      { toastLifeTimeMs: 300000 }
    );
  });

  it('opens the details, which close, or try again without the toast', async () => {
    const mocks = createErrorToastServices();
    const onRetry = jest.fn();
    showErrorToast(mocks.services, {
      title: 'Unable to delete boost rule "catalogs"',
      details: <p>Details</p>,
      onRetry,
    });

    const { modal, options } = openErrorDetails(mocks);
    // The title labels the modal.
    expect(screen.getByText('Unable to delete boost rule "catalogs"').id).toBe(
      options['aria-labelledby']
    );
    expect(modal.getByText('Details')).toBeInTheDocument();
    await userEvent.click(modal.getByRole('button', { name: 'Close' }));
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();

    await userEvent.click(modal.getByRole('button', { name: 'Try again' }));
    expect(mocks.close).toHaveBeenCalledTimes(2);
    expect(mocks.notifications.toasts.remove).toHaveBeenCalledWith(mocks.toast);
    expect(onRetry).toHaveBeenCalled();
  });

  it("closes with its one button when there's nothing to try again from here", async () => {
    const mocks = createErrorToastServices();
    notifyRequestError(mocks.services, new Error('Failed to fetch'), {
      title: 'Unable to save boost rule "catalogs"',
      description: 'An error prevented changes to this rule from being saved.',
    });

    const { modal } = openErrorDetails(mocks);
    // Without a response, there's no status, only the reason, and nothing to name.
    const [header, row] = within(modal.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent(/^ErrorReason$/);
    expect(row).toHaveTextContent(/^—Failed to fetch$/);
    expect(modal.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await userEvent.click(modal.getByRole('button', { name: 'Close' }));
    expect(mocks.close).toHaveBeenCalled();
  });
});
