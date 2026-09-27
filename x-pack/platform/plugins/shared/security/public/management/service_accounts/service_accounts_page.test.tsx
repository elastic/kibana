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
    nextPage,
    nextServiceAccounts = [],
    nextResponseCursor,
    loadMoreError,
  }: {
    canCreate?: boolean;
    serviceAccounts?: Array<{
      id: string;
      name: string;
      roles: string[];
      enabled: boolean;
      assumable: boolean;
    }>;
    loadError?: Error;
    nextPage?: string;
    nextServiceAccounts?: Array<{
      id: string;
      name: string;
      roles: string[];
      enabled: boolean;
      assumable: boolean;
    }>;
    nextResponseCursor?: string;
    loadMoreError?: Error;
  } = {}) => {
    const onCreateAccount = jest.fn();
    const list = jest.fn();
    if (loadError) {
      list.mockRejectedValue(loadError);
    } else {
      list.mockResolvedValueOnce({ serviceAccounts, nextPage });
      if (loadMoreError) {
        list.mockRejectedValueOnce(loadMoreError);
      } else if (nextPage) {
        list.mockResolvedValueOnce({
          serviceAccounts: nextServiceAccounts,
          nextPage: nextResponseCursor,
        });
      }
    }

    renderWithI18n(
      <EuiProvider>
        <MockAppHeaderProvider>
          <ServiceAccountsPage
            canCreate={canCreate}
            serviceAccountsAPIClient={{ list }}
            onCreateAccount={onCreateAccount}
          />
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    return { onCreateAccount, list };
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

  it('renders loaded accounts without unavailable follow-up actions', async () => {
    renderPage({
      serviceAccounts: [
        {
          id: 'account-id',
          name: 'nightshift-relay',
          roles: ['viewer'],
          enabled: true,
          assumable: true,
        },
      ],
    });

    expect(await screen.findByTestId('serviceAccountsTable')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('loads the next cursor page on demand', async () => {
    const { list } = renderPage({
      serviceAccounts: [
        {
          id: 'first-id',
          name: 'first-account',
          roles: ['viewer'],
          enabled: true,
          assumable: true,
        },
      ],
      nextPage: 'next-page',
      nextServiceAccounts: [
        {
          id: 'second-id',
          name: 'second-account',
          roles: ['editor'],
          enabled: true,
          assumable: true,
        },
      ],
    });

    await user.click(await screen.findByTestId('serviceAccountsLoadMore'));

    expect(await screen.findByText('second-account')).toBeVisible();
    expect(list).toHaveBeenNthCalledWith(1, { limit: 100 });
    expect(list).toHaveBeenNthCalledWith(2, { limit: 100, after: 'next-page' });
  });

  it('keeps loaded accounts visible when the next cursor page fails', async () => {
    renderPage({
      serviceAccounts: [
        {
          id: 'account-id',
          name: 'nightshift-relay',
          roles: ['viewer'],
          enabled: true,
          assumable: true,
        },
      ],
      nextPage: 'next-page',
      loadMoreError: new Error('Unavailable'),
    });

    await user.click(await screen.findByTestId('serviceAccountsLoadMore'));

    expect(await screen.findByText('Unable to load more service accounts.')).toBeVisible();
    expect(screen.getByText('nightshift-relay')).toBeVisible();
  });

  it('rejects a repeated cursor without appending a duplicate page', async () => {
    renderPage({
      serviceAccounts: [
        {
          id: 'account-id',
          name: 'nightshift-relay',
          roles: ['viewer'],
          enabled: true,
          assumable: true,
        },
      ],
      nextPage: 'repeated-page',
      nextServiceAccounts: [
        {
          id: 'duplicate-id',
          name: 'duplicate-account',
          roles: ['viewer'],
          enabled: true,
          assumable: true,
        },
      ],
      nextResponseCursor: 'repeated-page',
    });

    await user.click(await screen.findByTestId('serviceAccountsLoadMore'));

    expect(await screen.findByText('Unable to load more service accounts.')).toBeVisible();
    expect(screen.queryByText('duplicate-account')).not.toBeInTheDocument();
  });

  it('retries after a loading error', async () => {
    const { list } = renderPage({ loadError: new Error('Unavailable') });

    expect(await screen.findByTestId('serviceAccountsLoadError')).toBeVisible();
    await user.click(screen.getByTestId('serviceAccountsRetry'));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});
