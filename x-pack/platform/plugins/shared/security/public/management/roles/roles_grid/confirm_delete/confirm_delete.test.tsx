/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ConfirmDelete } from './confirm_delete';
import { rolesAPIClientMock } from '../../index.mock';

describe('ConfirmDelete', () => {
  let coreStart: ReturnType<typeof coreMock.createStart>;

  beforeEach(() => {
    coreStart = coreMock.createStart();
    coreStart.security.serviceAccounts.isEnabled.mockReturnValue(true);
  });

  const renderConfirmDelete = (rolesToDelete: string[]) =>
    renderWithI18n(
      <ConfirmDelete
        rolesToDelete={rolesToDelete}
        callback={jest.fn()}
        onCancel={jest.fn()}
        notifications={coreStart.notifications}
        rolesAPIClient={rolesAPIClientMock.create()}
        buildFlavor="traditional"
        serviceAccounts={coreStart.security.serviceAccounts}
        analytics={coreStart.analytics}
        i18n={coreStart.i18n}
        theme={coreStart.theme}
        userProfile={coreStart.userProfile}
        rendering={coreStart.rendering}
      />
    );

  it('warns about the service accounts holding the roles, grouped by role', async () => {
    coreStart.security.serviceAccounts.findByRoles.mockResolvedValue({
      serviceAccounts: [
        { id: 'kibana/relay', name: 'relay', roles: ['role-a', 'role-b'], enabled: true },
        { id: 'kibana/other', name: 'other', roles: ['role-b'], enabled: false },
      ],
      complete: true,
    });

    renderConfirmDelete(['role-a', 'role-b']);

    const callout = await screen.findByTestId('serviceAccountRoleUsageCallout');
    expect(callout).toHaveTextContent('2 service accounts use these roles');
    expect(callout).toHaveTextContent('Deleting these roles immediately removes the privileges');
    expect(within(callout).getAllByTestId('serviceAccountRoleUsageGroup')).toHaveLength(2);
    expect(coreStart.security.serviceAccounts.findByRoles).toHaveBeenCalledWith([
      'role-a',
      'role-b',
    ]);
  });

  it('notes when it could not check, without blocking the delete', async () => {
    coreStart.security.serviceAccounts.findByRoles.mockRejectedValue(new Error('boom'));

    renderConfirmDelete(['role-a']);

    expect(await screen.findByTestId('serviceAccountRoleUsageError')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
  });

  it('says nothing when service accounts are disabled', async () => {
    coreStart.security.serviceAccounts.isEnabled.mockReturnValue(false);

    renderConfirmDelete(['role-a']);

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountRoleUsageLoading')).not.toBeInTheDocument();
    expect(coreStart.security.serviceAccounts.findByRoles).not.toHaveBeenCalled();
  });
});
