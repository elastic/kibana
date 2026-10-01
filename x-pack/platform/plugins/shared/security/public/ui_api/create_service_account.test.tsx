/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { getUiApi } from '.';

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
    const { core, account, onCreated } = await renderComponent();
    expect(await screen.findByTestId('createServiceAccountFlyout')).toBeVisible();
    const selector = screen.getByRole('button', { name: 'Set privileges' });
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
      target: { value: account.name },
    });
    await user.click(selector);
    await user.click(await screen.findByTestId('roleOption-viewer'));
    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    expect(core.security.serviceAccounts.create).toHaveBeenCalledWith({
      name: account.name,
      roles: account.roles,
    });
    expect(onCreated).toHaveBeenCalledWith(account);
    expect(core.http.get).toHaveBeenCalledWith(
      '/api/security/role',
      expect.objectContaining({ query: expect.objectContaining({ includeReservedRoles: true }) })
    );
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
    const selector = await screen.findByRole('button', { name: 'Set privileges' });
    await waitFor(() => expect(selector).toBeEnabled());
    await user.click(selector);
    const link = screen.queryByRole('link', { name: /Create new role/ });
    if (options.roleManagementEnabled && options.canSaveRole) {
      expect(link).toHaveAttribute('href', '/app/management/security/roles/edit');
    } else {
      expect(link).not.toBeInTheDocument();
    }
  });

  it('calls onClose when cancelling', async () => {
    const { onClose, core } = await renderComponent();
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(core.security.serviceAccounts.create).not.toHaveBeenCalled();
  });
});
