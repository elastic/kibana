/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ServiceAccountsPage } from './service_accounts_page';

describe('ServiceAccountsPage', () => {
  it('renders the page actions and opens the documentation menu', async () => {
    const onCreateAccount = jest.fn();

    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsPage onCreateAccount={onCreateAccount} />
      </EuiProvider>
    );

    await user.click(screen.getByTestId('serviceAccountsPageCreateButton'));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('serviceAccountsPageMoreActionsButton'));
    expect(screen.getAllByRole('link', { name: /Learn more in docs/ })).toHaveLength(2);
  });
});
