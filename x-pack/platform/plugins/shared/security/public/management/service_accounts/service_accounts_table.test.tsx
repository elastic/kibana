/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    onDeleteAccount,
    onViewWorkloads,
    serviceAccounts = [firstAccount, secondAccount],
  }: {
    hasMore?: boolean;
    hasLoadMoreError?: boolean;
    onDeleteAccount?: (account: ServiceAccountTableItem) => void;
    onViewWorkloads?: (account: ServiceAccountTableItem) => void;
    serviceAccounts?: ServiceAccountTableItem[];
  } = {}) => {
    const onLoadMore = jest.fn();

    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsTable
          serviceAccounts={serviceAccounts}
          hasMore={hasMore}
          isLoadingMore={false}
          hasLoadMoreError={hasLoadMoreError}
          onLoadMore={onLoadMore}
          onDeleteAccount={onDeleteAccount}
          onViewWorkloads={onViewWorkloads}
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

  const openRoleFilter = async () => {
    fireEvent.click(screen.getByLabelText('Role Selection'));
    await screen.findByTestId('euiSelectableList');
  };

  const clickRoleOption = (role: string) =>
    fireEvent.click(within(screen.getByTestId('euiSelectableList')).getByText(role));

  const closeRoleFilter = async () => {
    fireEvent.click(screen.getByLabelText('Role Selection'));
    await waitFor(() => expect(screen.queryByTestId('euiSelectableList')).not.toBeInTheDocument());
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

    fireEvent.change(screen.getByTestId('serviceAccountsSearch'), {
      target: { value: 'incident-responder' },
    });

    expect(await screen.findByText('incident-responder')).toBeVisible();
    expect(screen.queryByText('nightshift-relay')).not.toBeInTheDocument();
  });

  it('filters accounts by the selected role and restores them when cleared', async () => {
    renderTable();

    await openRoleFilter();
    clickRoleOption('viewer');

    expect(screen.getByText('nightshift-relay')).toBeVisible();
    expect(screen.queryByText('incident-responder')).not.toBeInTheDocument();

    clickRoleOption('viewer');

    expect(screen.getByText('incident-responder')).toBeVisible();
    expect(screen.getByText('nightshift-relay')).toBeVisible();

    await closeRoleFilter();
  });

  it.each([
    { column: 'Roles', ascending: ['incident-responder', 'nightshift-relay'] },
    { column: 'Created by', ascending: ['nightshift-relay', 'incident-responder'] },
  ])('sorts accounts by $column in both directions', async ({ column, ascending }) => {
    renderTable();
    const sortButton = within(
      screen.getByRole('columnheader', { name: new RegExp(column) })
    ).getByRole('button');

    fireEvent.click(sortButton);
    screen.getAllByRole('rowheader').forEach((header, index) => {
      expect(header).toHaveTextContent(ascending[index]);
    });

    fireEvent.click(sortButton);
    const descending = [...ascending].reverse();
    screen.getAllByRole('rowheader').forEach((header, index) => {
      expect(header).toHaveTextContent(descending[index]);
    });
  });

  it('explains a workload count that could not be taken on keyboard focus', async () => {
    renderTable();
    const row = screen.getByRole('row', { name: /incident-responder/ });
    const cells = within(row).getAllByRole('cell');
    const workloadCell = cells[cells.length - 1];
    const unavailableCount = within(workloadCell).getByText('—');

    expect(unavailableCount).toHaveAttribute('tabindex', '0');
    act(() => unavailableCount.focus());

    expect(unavailableCount).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Unable to count the workloads bound to this account.'
    );
  });

  describe('workload counts', () => {
    const getWorkloadCell = (name: string) => {
      const cells = within(screen.getByRole('row', { name: new RegExp(name) })).getAllByRole(
        'cell'
      );
      return cells[cells.length - 1];
    };

    it('opens the workloads of a bound account from its View link', () => {
      const onViewWorkloads = jest.fn();
      renderTable({ onViewWorkloads });

      const workloadCell = getWorkloadCell('nightshift-relay');
      expect(within(workloadCell).getByTestId('serviceAccountWorkloadCount')).toHaveTextContent(
        '3'
      );
      fireEvent.click(
        within(workloadCell).getByRole('button', {
          name: 'View the workloads bound to nightshift-relay',
        })
      );

      expect(onViewWorkloads).toHaveBeenCalledWith(firstAccount);
    });

    it('shows a plain zero, with no View link, for an account with no workloads', () => {
      renderTable({
        onViewWorkloads: jest.fn(),
        serviceAccounts: [{ ...secondAccount, workloadCount: 0 }],
      });

      const workloadCell = getWorkloadCell('incident-responder');
      expect(within(workloadCell).getByTestId('serviceAccountWorkloadCount')).toHaveTextContent(
        '0'
      );
      expect(within(workloadCell).queryByTestId('serviceAccountViewWorkloads')).toBeNull();
    });

    it('shows no View link when viewing is not offered', () => {
      renderTable();

      expect(screen.queryByTestId('serviceAccountViewWorkloads')).not.toBeInTheDocument();
    });
  });

  it('loads the next cursor page on demand', async () => {
    const { onLoadMore } = renderTable({ hasMore: true });

    expect(
      screen.getByText('Search and filters currently include 2 loaded accounts.')
    ).toBeVisible();
    fireEvent.click(screen.getByTestId('serviceAccountsLoadMore'));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('keeps the current page after loading more accounts', async () => {
    renderPaginatedTable();

    fireEvent.click(screen.getByTestId('pagination-button-next'));
    expect(screen.getByText('account-10')).toBeVisible();
    expect(screen.queryByText('account-00')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceAccountsLoadMore'));
    expect(screen.getByText('account-10')).toBeVisible();
    expect(screen.queryByText('account-00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pagination-button-next'));
    expect(screen.getByText('incident-responder')).toBeVisible();
  });

  it('resets the page when searching from a later page', async () => {
    renderPaginatedTable();

    fireEvent.click(screen.getByTestId('pagination-button-next'));
    fireEvent.change(screen.getByTestId('serviceAccountsSearch'), {
      target: { value: 'account-00' },
    });

    expect(await screen.findByText('account-00')).toBeVisible();
    expect(screen.queryByText('account-10')).not.toBeInTheDocument();
  });

  it('resets the page when filtering by role from a later page', async () => {
    renderPaginatedTable();

    fireEvent.click(screen.getByTestId('pagination-button-next'));
    await openRoleFilter();
    clickRoleOption('editor');

    expect(screen.getByText('account-00')).toBeVisible();
    expect(screen.queryByText('account-10')).not.toBeInTheDocument();

    await closeRoleFilter();
  });

  it('offers to retry when loading the next cursor page fails', () => {
    renderTable({ hasLoadMoreError: true });

    expect(screen.getByText('Unable to load more service accounts.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('starts deleting the account from its row', () => {
    const onDeleteAccount = jest.fn();
    renderTable({ onDeleteAccount });

    const [firstRowDelete] = screen.getAllByTestId('serviceAccountsDeleteAction');
    fireEvent.click(firstRowDelete);

    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
    expect(onDeleteAccount.mock.calls[0][0]).toMatchObject({ id: expect.any(String) });
  });

  it('offers no row actions unless deleting is allowed', () => {
    renderTable();

    expect(screen.queryByTestId('serviceAccountsDeleteAction')).not.toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });
});
