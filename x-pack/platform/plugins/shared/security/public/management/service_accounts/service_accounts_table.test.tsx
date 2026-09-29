/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, screen, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import React, { useState } from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ServiceAccountTableItem } from './service_accounts_table';
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

  const renderPaginatedTable = () => {
    const accounts = Array.from({ length: 20 }, (_, index) => ({
      ...firstAccount,
      id: `account-${index}`,
      name: `account-${String(index).padStart(2, '0')}`,
      roles: index === 0 ? ['editor'] : ['viewer'],
    }));
    const TableWithLoadMore = () => {
      const [loadedAccounts, setLoadedAccounts] = useState<ServiceAccountTableItem[]>(accounts);
      return (
        <ServiceAccountsTable
          serviceAccounts={loadedAccounts}
          hasMore={true}
          isLoadingMore={false}
          hasLoadMoreError={false}
          onLoadMore={() => setLoadedAccounts([...accounts, secondAccount])}
        />
      );
    };
    renderWithI18n(
      <EuiProvider>
        <TableWithLoadMore />
      </EuiProvider>
    );
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

  it('filters accounts by the selected role and restores them when cleared', async () => {
    renderTable();

    await user.click(screen.getByRole('button', { name: 'Role Selection' }));
    await user.click(await screen.findByRole('option', { name: 'viewer' }));

    expect(screen.getByText('nightshift-relay')).toBeVisible();
    expect(screen.queryByText('incident-responder')).not.toBeInTheDocument();

    await user.click(await screen.findByRole('option', { name: 'viewer' }));

    expect(screen.getByText('incident-responder')).toBeVisible();
    expect(screen.getByText('nightshift-relay')).toBeVisible();
  });

  it.each([
    { column: 'Roles', ascending: ['incident-responder', 'nightshift-relay'] },
    { column: 'Created by', ascending: ['nightshift-relay', 'incident-responder'] },
  ])('sorts accounts by $column in both directions', async ({ column, ascending }) => {
    renderTable();
    const sortButton = within(
      screen.getByRole('columnheader', { name: new RegExp(column) })
    ).getByRole('button');

    await user.click(sortButton);
    screen.getAllByRole('rowheader').forEach((header, index) => {
      expect(header).toHaveTextContent(ascending[index]);
    });

    await user.click(sortButton);
    const descending = [...ascending].reverse();
    screen.getAllByRole('rowheader').forEach((header, index) => {
      expect(header).toHaveTextContent(descending[index]);
    });
  });

  it('explains the unavailable workload count on keyboard focus', async () => {
    renderTable();
    const row = screen.getByRole('row', { name: /incident-responder/ });
    const cells = within(row).getAllByRole('cell');
    const workloadCell = cells[cells.length - 1];
    const unavailableCount = within(workloadCell).getByText('—');

    expect(unavailableCount).toHaveAttribute('tabindex', '0');
    act(() => unavailableCount.focus());

    expect(unavailableCount).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Workload associations are not available yet.'
    );
  });

  it('loads the next cursor page on demand', async () => {
    const { onLoadMore } = renderTable({ hasMore: true });

    expect(
      screen.getByText('Search and filters currently include 2 loaded accounts.')
    ).toBeVisible();
    await user.click(screen.getByTestId('serviceAccountsLoadMore'));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('keeps the current page after loading more accounts', async () => {
    renderPaginatedTable();

    await user.click(screen.getByTestId('pagination-button-next'));
    expect(screen.getByText('account-10')).toBeVisible();
    expect(screen.queryByText('account-00')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('serviceAccountsLoadMore'));
    expect(screen.getByText('account-10')).toBeVisible();
    expect(screen.queryByText('account-00')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('pagination-button-next'));
    expect(screen.getByText('incident-responder')).toBeVisible();
  });

  it('resets the page when searching from a later page', async () => {
    renderPaginatedTable();

    await user.click(screen.getByTestId('pagination-button-next'));
    await user.type(screen.getByTestId('serviceAccountsSearch'), 'account-00');

    expect(screen.getByText('account-00')).toBeVisible();
    expect(screen.queryByText('account-10')).not.toBeInTheDocument();
  });

  it('resets the page when filtering by role from a later page', async () => {
    renderPaginatedTable();

    await user.click(screen.getByTestId('pagination-button-next'));
    await user.click(screen.getByRole('button', { name: 'Role Selection' }));
    await user.click(await screen.findByRole('option', { name: 'editor' }));

    expect(screen.getByText('account-00')).toBeVisible();
    expect(screen.queryByText('account-10')).not.toBeInTheDocument();
  });

  it('offers to retry when loading the next cursor page fails', () => {
    renderTable({ hasLoadMoreError: true });

    expect(screen.getByText('Unable to load more service accounts.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
