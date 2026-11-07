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
import { notifyProfileDeletion } from './profile_deletion_notice';

const TIMEOUT = {
  status: '504 Gateway Timeout',
  message: "Elasticsearch didn't respond in time.",
};

describe('notifyProfileDeletion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('says the profile was deleted, counting its rules when it had any', () => {
    const mocks = createErrorToastServices();

    notifyProfileDeletion(
      mocks.services,
      'catalog-search',
      { ruleCount: 0, failures: [] },
      jest.fn()
    );
    notifyProfileDeletion(
      mocks.services,
      'catalog-search',
      { ruleCount: 2, failures: [] },
      jest.fn()
    );

    expect(mocks.notifications.toasts.addSuccess.mock.calls).toEqual([
      ['Deleted boost profile "catalog-search"'],
      ['Deleted boost profile "catalog-search" and 2 rules'],
    ]);
  });

  it('lists the rules that failed to delete, which kept the profile, and tries them again', async () => {
    const mocks = createErrorToastServices();
    const onRetry = jest.fn();
    notifyProfileDeletion(
      mocks.services,
      'catalog-search',
      { ruleCount: 2, failures: [{ kind: 'rule', name: 'archives', ...TIMEOUT }] },
      onRetry
    );

    const { toastInput, modal } = openErrorDetails(mocks);
    expect(toastInput.title).toBe('Unable to delete boost profile "catalog-search"');
    expect(toastInput.text).toBe(
      "Couldn't delete 1 of the 2 rules that use it, so the profile was kept."
    );
    expect(
      modal.getByText(
        "Couldn't delete 1 of the 2 rules that use it, so the profile was kept. You can try again."
      )
    ).toBeInTheDocument();
    const [header, row] = within(modal.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent('Boost ruleErrorReason');
    expect(row).toHaveTextContent(
      "archives504 Gateway TimeoutElasticsearch didn't respond in time."
    );

    await userEvent.click(modal.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledWith(['archives']);
  });

  it("shows why the profile failed to delete after its rules didn't, and tries it alone", async () => {
    const mocks = createErrorToastServices();
    const onRetry = jest.fn();
    notifyProfileDeletion(
      mocks.services,
      'catalog-search',
      { ruleCount: 1, failures: [{ kind: 'profile', name: 'catalog-search', ...TIMEOUT }] },
      onRetry
    );

    const { toastInput, modal } = openErrorDetails(mocks);
    expect(toastInput.text).toBe('Deleted the rule that used it, but not the profile.');
    // The title names it, so the table doesn't.
    const [header, row] = within(modal.getByRole('table')).getAllByRole('row');
    expect(header).toHaveTextContent(/^ErrorReason$/);
    expect(row).toHaveTextContent(/^504 Gateway TimeoutElasticsearch didn't respond in time\.$/);
    await userEvent.click(modal.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledWith([]);
  });

  it('leaves the toast to its title for a profile without rules', () => {
    const mocks = createErrorToastServices();
    notifyProfileDeletion(
      mocks.services,
      'catalog-search',
      { ruleCount: 0, failures: [{ kind: 'profile', name: 'catalog-search', ...TIMEOUT }] },
      jest.fn()
    );

    const { toastInput, modal } = openErrorDetails(mocks);
    expect(toastInput.text).toBeUndefined();
    expect(
      modal.getByText('An error prevented this profile from being deleted. You can try again.')
    ).toBeInTheDocument();
  });
});
