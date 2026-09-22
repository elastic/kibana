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
    hasCredential: true,
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
    enabled: true,
    hasCredential: true,
  };

  const renderTable = () => {
    const callbacks = {
      onOpenAccount: jest.fn(),
      onOpenWorkloads: jest.fn(),
      onDeleteAccount: jest.fn(),
    };

    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsTable
          serviceAccounts={[firstAccount, secondAccount]}
          canDelete={true}
          {...callbacks}
        />
      </EuiProvider>
    );

    return callbacks;
  };

  it('renders directory metadata and forwards row actions', async () => {
    const callbacks = renderTable();

    expect(screen.getByText('Executes nightshift workflows')).toBeVisible();
    expect(screen.getByText('viewer')).toBeVisible();
    expect(screen.getByText('Night Operator')).toBeVisible();

    await user.click(screen.getByText('View'));
    expect(callbacks.onOpenWorkloads).toHaveBeenCalledWith(firstAccount);

    await user.click(screen.getByTestId('serviceAccountDelete-first-id'));
    expect(callbacks.onDeleteAccount).toHaveBeenCalledWith(firstAccount);
  });

  it('filters accounts by free text', async () => {
    renderTable();

    await user.type(screen.getByTestId('serviceAccountsSearch'), 'incident-responder');

    expect(await screen.findByText('incident-responder')).toBeVisible();
    expect(screen.queryByText('nightshift-relay')).not.toBeInTheDocument();
  });
});
