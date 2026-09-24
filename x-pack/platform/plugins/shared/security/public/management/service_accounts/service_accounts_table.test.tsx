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

import { ServiceAccountsTable } from './service_accounts_table';

describe('ServiceAccountsTable', () => {
  const firstAccount = {
    id: 'first-id',
    name: 'nightshift-relay',
    description: 'Executes nightshift workflows',
    roles: ['viewer'],
    enabled: true,
    assumable: true,
    createdBy: {
      type: 'user' as const,
      username: 'operator',
      displayName: 'Night Operator',
    },
    workloadCount: 3,
  };
  const secondAccount = {
    id: 'second-id',
    name: 'incident-responder',
    roles: ['editor'],
    enabled: false,
    assumable: true,
  };

  const renderTable = ({
    hasMore = false,
    hasLoadMoreError = false,
  }: {
    hasMore?: boolean;
    hasLoadMoreError?: boolean;
  } = {}) => {
    const onLoadMore = jest.fn();

    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsTable
          serviceAccounts={[firstAccount, secondAccount]}
          hasMore={hasMore}
          isLoadingMore={false}
          hasLoadMoreError={hasLoadMoreError}
          onLoadMore={onLoadMore}
        />
      </EuiProvider>
    );

    return { onLoadMore };
  };

  it('renders directory metadata without unavailable follow-up actions', () => {
    renderTable();

    expect(screen.getByText('Executes nightshift workflows')).toBeVisible();
    expect(screen.getByText('viewer')).toBeVisible();
    expect(screen.getByText('Night Operator')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('marks only disabled accounts', () => {
    renderTable();

    const disabledBadges = screen.getAllByTestId('serviceAccountDisabledBadge');
    expect(disabledBadges).toHaveLength(1);
    expect(disabledBadges[0].closest('tr')).toHaveTextContent('incident-responder');
  });

  it('filters accounts by free text', async () => {
    renderTable();

    await user.type(screen.getByTestId('serviceAccountsSearch'), 'incident-responder');

    expect(await screen.findByText('incident-responder')).toBeVisible();
    expect(screen.queryByText('nightshift-relay')).not.toBeInTheDocument();
  });

  it('loads the next cursor page on demand', async () => {
    const { onLoadMore } = renderTable({ hasMore: true });

    expect(
      screen.getByText('Search and filters currently include 2 loaded accounts.')
    ).toBeVisible();
    await user.click(screen.getByTestId('serviceAccountsLoadMore'));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('offers to retry when loading the next cursor page fails', () => {
    renderTable({ hasLoadMoreError: true });

    expect(screen.getByText('Unable to load more service accounts.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
