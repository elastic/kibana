/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { getUiApi } from '.';
import * as roleSelector from '../management/service_accounts/service_account_role_selector';

const renderComponent = async ({
  enabled = true,
  canCreate = true,
  roleManagementEnabled = true,
  canSaveRole = true,
} = {}) => {
  const core = coreMock.createStart();
  core.security.serviceAccounts.isEnabled.mockReturnValue(enabled);
  core.security.serviceAccounts.canCreate.mockReturnValue(canCreate);
  core.application.capabilities = {
    ...core.application.capabilities,
    roles: { save: canSaveRole },
  };
  core.application.getUrlForApp.mockReturnValue('/app/management/security/roles/edit');
  core.http.get.mockResolvedValue([
    {
      name: 'viewer',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [],
      metadata: { _reserved: true },
    },
  ]);
  const account = { id: 'account-id', name: 'workflow-runner', roles: ['viewer'] };
  core.security.serviceAccounts.create.mockResolvedValue(account);
  const onCreated = jest.fn();
  const onClose = jest.fn();
  const uiApi = getUiApi({ core, isServerless: true, roleManagementEnabled });
  await act(async () => {
    renderWithI18n(
      <EuiProvider>{uiApi.components.getCreateServiceAccount({ onCreated, onClose })}</EuiProvider>
    );
  });
  return { core, account, onCreated, onClose };
};

describe('getCreateServiceAccount UI API', () => {
  it('loads the standalone flyout and reports the created account', async () => {
    const selector = jest
      .spyOn(roleSelector, 'ServiceAccountRoleSelector')
      .mockImplementation(({ onChange }) => (
        <button
          type="button"
          data-test-subj="selectViewerRole"
          onClick={() => onChange(['viewer'])}
        >
          Select roles
        </button>
      ));
    try {
      const { core, account, onCreated } = await renderComponent();
      expect(await screen.findByTestId('createServiceAccountFlyout')).toBeVisible();
      fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
        target: { value: account.name },
      });
      fireEvent.click(screen.getByTestId('selectViewerRole'));
      const submit = screen.getByTestId('createServiceAccountSubmit');
      await waitFor(() => expect(submit).toBeEnabled());
      fireEvent.click(submit);

      await waitFor(() => expect(onCreated).toHaveBeenCalledWith(account));
      expect(core.security.serviceAccounts.create).toHaveBeenCalledWith({
        name: account.name,
        roles: account.roles,
      });
      expect(core.http.get).toHaveBeenCalledWith(
        '/api/security/role',
        expect.objectContaining({ query: expect.objectContaining({ includeReservedRoles: true }) })
      );
    } finally {
      selector.mockRestore();
    }
  });

  it.each([
    { enabled: false, canCreate: true },
    { enabled: true, canCreate: false },
    { enabled: false, canCreate: false },
  ])('does not render or fetch roles when disallowed (%j)', async (options) => {
    const { core } = await renderComponent(options);
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
    expect(core.http.get).not.toHaveBeenCalled();
    expect(core.security.serviceAccounts.create).not.toHaveBeenCalled();
  });

  it.each([
    { roleManagementEnabled: true, canSaveRole: true },
    { roleManagementEnabled: false, canSaveRole: true },
    { roleManagementEnabled: true, canSaveRole: false },
  ])('gates standalone role-editor navigation (%j)', async (options) => {
    await renderComponent(options);
    const selector = await screen.findByTestId('serviceAccountRolesSelector');
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.click(selector);
    await screen.findByText('Custom roles');
    const link = screen.queryByTestId('createServiceAccountRoleLink');
    if (options.roleManagementEnabled && options.canSaveRole) {
      expect(link).toHaveAttribute('href', '/app/management/security/roles/edit');
    } else {
      expect(link).not.toBeInTheDocument();
    }
  });

  it('calls onClose when cancelling', async () => {
    const { onClose, core } = await renderComponent();
    fireEvent.click(await screen.findByTestId('createServiceAccountCancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(core.security.serviceAccounts.create).not.toHaveBeenCalled();
  });
});
