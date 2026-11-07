/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createErrorToastServices,
  openErrorDetails,
} from '../../test_helpers/error_toast_services';
import { notifyRuleDeletionError } from './rule_deletion_notice';

describe('notifyRuleDeletionError', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('names the rule, and shows what the server said only in its details', async () => {
    const mocks = createErrorToastServices();
    const onRetry = jest.fn();
    const error = Object.assign(new Error('Gateway Timeout'), {
      body: { message: "Elasticsearch didn't respond in time." },
      response: { status: 504, statusText: 'Gateway Timeout' },
    });

    notifyRuleDeletionError(mocks.services, 'catalogs', error, onRetry);

    const { toastInput, modal } = openErrorDetails(mocks);
    expect(toastInput.title).toBe('Unable to delete boost rule "catalogs"');
    expect(toastInput.text).toBeUndefined();
    expect(
      modal.getByText('An error prevented this rule from being deleted. You can try again.')
    ).toBeInTheDocument();
    // The title names it, so the table doesn't.
    const [header, row] = within(modal.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent(/^ErrorReason$/);
    expect(row).toHaveTextContent(/^504 Gateway TimeoutElasticsearch didn't respond in time\.$/);
    await userEvent.click(modal.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
