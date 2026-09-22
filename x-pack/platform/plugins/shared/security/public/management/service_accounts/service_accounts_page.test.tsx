/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { screen, waitFor } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ServiceAccountsPage } from './service_accounts_page';

describe('ServiceAccountsPage', () => {
  const renderPage = ({
    canCreate = true,
    serviceAccounts = [],
    loadError,
  }: {
    canCreate?: boolean;
    serviceAccounts?: Array<{
      id: string;
      name: string;
      roles: string[];
      enabled: boolean;
      hasCredential: boolean;
    }>;
    loadError?: Error;
  } = {}) => {
    const callbacks = {
      onCreateAccount: jest.fn(),
      onOpenAccount: jest.fn(),
      onOpenWorkloads: jest.fn(),
      onDeleteAccount: jest.fn(),
    };
    const getAll = jest.fn(
      loadError ? () => Promise.reject(loadError) : () => Promise.resolve(serviceAccounts)
    );

    renderWithI18n(
      <EuiProvider>
        <MockAppHeaderProvider>
          <ServiceAccountsPage
            canCreate={canCreate}
            serviceAccountsAPIClient={{ getAll }}
            {...callbacks}
          />
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    return { ...callbacks, getAll };
  };

  it('starts account creation from the page action', async () => {
    const { onCreateAccount } = renderPage();

    await user.click(await screen.findByTestId('serviceAccountsPageCreateButton'));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('serviceAccountsEmptyPromptCreateButton')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides create actions without the save capability', async () => {
    renderPage({ canCreate: false });
    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title);

    expect(screen.queryByTestId('serviceAccountsPageCreateButton')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId('serviceAccountsEmptyPromptCreateButton')).not.toBeInTheDocument()
    );
  });

  it('renders loaded accounts and forwards table actions', async () => {
    const callbacks = renderPage({
      serviceAccounts: [
        {
          id: 'account-id',
          name: 'nightshift-relay',
          roles: ['viewer'],
          enabled: true,
          hasCredential: true,
        },
      ],
    });

    expect(await screen.findByTestId('serviceAccountsTable')).toBeVisible();

    await user.click(screen.getByTestId('serviceAccountName-account-id'));
    expect(callbacks.onOpenAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'account-id' })
    );

    await user.click(screen.getByTestId('serviceAccountDelete-account-id'));
    expect(callbacks.onDeleteAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'account-id' })
    );
  });

  it('hides delete actions without the save capability', async () => {
    renderPage({
      canCreate: false,
      serviceAccounts: [
        {
          id: 'account-id',
          name: 'nightshift-relay',
          roles: ['viewer'],
          enabled: true,
          hasCredential: true,
        },
      ],
    });

    expect(await screen.findByTestId('serviceAccountsTable')).toBeVisible();
    expect(screen.queryByTestId('serviceAccountDelete-account-id')).not.toBeInTheDocument();
  });

  it('retries after a loading error', async () => {
    const { getAll } = renderPage({ loadError: new Error('Unavailable') });

    expect(await screen.findByTestId('serviceAccountsLoadError')).toBeVisible();
    await user.click(screen.getByTestId('serviceAccountsRetry'));

    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
  });
});
