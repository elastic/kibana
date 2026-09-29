/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, screen, waitFor, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ServiceAccount } from '@kbn/core-security-browser';
import { Router } from '@kbn/shared-ux-router';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ServiceAccountsApp } from './service_accounts_app';
import type { Role } from '../../../common';

const availableRoles: Role[] = [
  {
    name: 'workflow_reader',
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [],
    metadata: {},
  },
  {
    name: 'viewer',
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [],
    metadata: { _reserved: true },
  },
];
const account = { id: 'account-id', name: 'workflow-runner', roles: ['workflow_reader'] };

const renderApp = ({
  canCreate = true,
  pathname = '/create',
  canCreateRole = true,
  isServerless = false,
} = {}) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const list = jest.fn().mockResolvedValue({ serviceAccounts: [] });
  const create = jest.fn().mockResolvedValue(account);
  const getRoles = jest.fn().mockResolvedValue(availableRoles);
  const onCreated = jest.fn();
  renderWithI18n(
    <EuiProvider>
      <MockAppHeaderProvider>
        <Router history={history}>
          <ServiceAccountsApp
            isServerless={isServerless}
            canCreate={canCreate}
            serviceAccountsAPIClient={{ list, create }}
            rolesAPIClient={{ getRoles }}
            createRoleUrl={canCreateRole ? '/app/management/security/roles/edit' : undefined}
            onCreated={onCreated}
          />
        </Router>
      </MockAppHeaderProvider>
    </EuiProvider>
  );
  return { history, list, create, getRoles, onCreated };
};

const fillForm = async () => {
  await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());
  await user.type(screen.getByTestId('serviceAccountNameInput'), account.name);
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByTestId('roleOption-workflow_reader'));
};

describe('ServiceAccountsApp', () => {
  it('creates an account with an optional description', async () => {
    const { create } = renderApp();
    await fillForm();
    await user.type(
      screen.getByTestId('createServiceAccountDescription'),
      'Reads investigation events.'
    );
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    expect(create).toHaveBeenCalledWith({
      name: account.name,
      roles: ['workflow_reader'],
      description: 'Reads investigation events.',
    });
  });

  it('does not offer descriptions on Serverless while UIAM does not support them', () => {
    renderApp({ isServerless: true });
    expect(screen.queryByTestId('createServiceAccountDescription')).not.toBeInTheDocument();
  });

  it('opens the create flyout from the directory action', async () => {
    const { history } = renderApp({ pathname: '/' });
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();

    await user.click(await screen.findByTestId('serviceAccountsPageCreateButton'));

    expect(history.location.pathname).toBe('/create');
    expect(await screen.findByTestId('serviceAccountNameInput')).toBeVisible();
  });

  it('creates with explicit roles, closes the flyout, and refreshes the directory', async () => {
    const { create, list, history, onCreated } = renderApp();
    await fillForm();
    list.mockResolvedValue({ serviceAccounts: [{ ...account, enabled: true, assumable: true }] });

    await user.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(create).toHaveBeenCalledWith({ name: account.name, roles: ['workflow_reader'] });
    expect(onCreated).toHaveBeenCalledWith(account);
    expect(history.location.pathname).toBe('/');
    expect(await screen.findByText(account.name)).toBeVisible();
    expect(list).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
  });

  it('requires a valid name and at least one selected role', async () => {
    const { create } = renderApp();
    await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());
    await user.type(screen.getByTestId('serviceAccountNameInput'), '../invalid');
    await user.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(screen.getByText(/Enter a name of up to/)).toBeVisible();
    expect(screen.getByText('Select at least one role.')).toBeVisible();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(create).not.toHaveBeenCalled();
  });

  it('shows custom and built-in roles without preselecting any role', async () => {
    const { getRoles } = renderApp();
    await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());
    expect(getRoles).toHaveBeenCalledWith({ includeReservedRoles: true });
    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Custom roles')).toBeVisible();
    expect(screen.getByTestId('roleOption-workflow_reader')).toBeVisible();
    expect(within(screen.getByTestId('roleOption-viewer')).getByText('built in')).toBeVisible();
    expect(screen.getByRole('link', { name: /Create new role/ })).toHaveAttribute(
      'href',
      '/app/management/security/roles/edit'
    );
  });

  it('retains form values after a server error and allows retrying', async () => {
    const { create } = renderApp();
    create.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        request: {},
        body: { message: 'An account with this name already exists.' },
      })
    );
    await fillForm();
    await user.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(await screen.findByText('An account with this name already exists.')).toBeVisible();
    expect(screen.getByTestId('serviceAccountNameInput')).toHaveValue(account.name);
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    expect(create).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
  });

  it('blocks duplicate submissions and closing while creation is pending', async () => {
    const { create } = renderApp();
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    await user.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => resolveCreation(account));
  });

  it('does not redirect after leaving while creation is pending', async () => {
    const { create, history, onCreated } = renderApp();
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    act(() => history.push('/another-page'));

    await act(async () => resolveCreation(account));

    expect(history.location.pathname).toBe('/another-page');
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('requires removing roles that disappeared when refreshing the role list', async () => {
    const { create, getRoles } = renderApp();
    await fillForm();
    getRoles.mockResolvedValue([availableRoles[1]]);
    await user.click(screen.getByRole('button', { name: 'Refresh roles' }));
    await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(screen.getByText(/Remove roles that are no longer available/)).toBeVisible();
    expect(create).not.toHaveBeenCalled();
  });

  it('allows retrying role loading without losing the name', async () => {
    const { getRoles, create } = renderApp({ pathname: '/' });
    getRoles.mockRejectedValueOnce(new Error('Unavailable'));
    await user.click(await screen.findByTestId('serviceAccountsPageCreateButton'));
    expect(await screen.findByText('Unable to load roles.')).toBeVisible();
    await user.type(screen.getByTestId('serviceAccountNameInput'), account.name);
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Refresh roles' }));

    await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());
    expect(screen.getByTestId('serviceAccountNameInput')).toHaveValue(account.name);
    expect(create).not.toHaveBeenCalled();
  });

  it('cancels without creating or refetching the directory', async () => {
    const { history, create, list } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(history.location.pathname).toBe('/');
    expect(create).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('does not open the flyout or load roles without the create capability', async () => {
    const { getRoles } = renderApp({ canCreate: false });
    await screen.findByTestId('serviceAccountsEmptyPrompt');

    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountsPageCreateButton')).not.toBeInTheDocument();
    expect(getRoles).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'explains cross-project role behavior only on serverless (%s)',
    async (isServerless) => {
      renderApp({ isServerless });
      await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());

      const explanation = screen.queryByText(/For cross-project search/);
      if (isServerless) {
        expect(explanation).toBeVisible();
      } else {
        expect(explanation).not.toBeInTheDocument();
      }
    }
  );

  it('hides create-role navigation without permission', async () => {
    renderApp({ canCreateRole: false });
    await waitFor(() => expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled());

    expect(screen.queryByRole('link', { name: /Create new role/ })).not.toBeInTheDocument();
  });
});
