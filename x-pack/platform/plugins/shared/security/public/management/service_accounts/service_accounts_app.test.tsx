/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import user from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ServiceAccount } from '@kbn/core-security-browser';
import { Router } from '@kbn/shared-ux-router';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import * as roleSelector from './service_account_role_selector';
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

const renderApp = async ({
  canCreate = true,
  pathname = '/create',
  canCreateRole = true,
  isServerless = false,
  roleOptions = availableRoles,
} = {}) => {
  const history = createMemoryHistory({ initialEntries: [pathname] });
  const list = jest.fn().mockResolvedValue({ serviceAccounts: [] });
  const create = jest.fn().mockResolvedValue(account);
  const getRoles = jest.fn().mockResolvedValue(roleOptions);
  const onCreated = jest.fn();
  const view = renderWithI18n(
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
  await waitForElementToBeRemoved(() => screen.queryByTestId('serviceAccountsLoading'));
  return { history, list, create, getRoles, onCreated, unmount: view.unmount };
};

const fillForm = async () => {
  await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());
  fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
    target: { value: account.name },
  });
  fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));
  fireEvent.click(await screen.findByTestId('roleOption-workflow_reader'));
  fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));
  await waitForElementToBeRemoved(() => screen.queryByTestId('roleOption-workflow_reader'));
};

describe('ServiceAccountsApp', () => {
  it('keeps Create account disabled until name and roles are valid', async () => {
    await renderApp();
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();
    await fillForm();
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled();
  });

  it('creates an account with an optional description', async () => {
    const { create } = await renderApp();
    await fillForm();
    fireEvent.change(screen.getByTestId('createServiceAccountDescription'), {
      target: { value: 'Reads investigation events.' },
    });
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

    await waitForElementToBeRemoved(() => screen.queryByTestId('createServiceAccountFlyout'));
    expect(create).toHaveBeenCalledWith({
      name: account.name,
      roles: ['workflow_reader'],
      description: 'Reads investigation events.',
    });
  });

  it('does not offer descriptions on Serverless while UIAM does not support them', async () => {
    await renderApp({ isServerless: true });
    expect(screen.queryByTestId('createServiceAccountDescription')).not.toBeInTheDocument();
  });

  it('opens the create flyout from the directory action', async () => {
    const { history } = await renderApp({ pathname: '/' });
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('serviceAccountsPageCreateButton'));

    expect(history.location.pathname).toBe('/create');
    expect(await screen.findByTestId('serviceAccountNameInput')).toBeVisible();
  });

  it('creates with explicit roles, closes the flyout, and refreshes the directory', async () => {
    const { create, list, history, onCreated } = await renderApp();
    await fillForm();
    list.mockResolvedValue({ serviceAccounts: [{ ...account, enabled: true, assumable: true }] });

    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(account));
    expect(create).toHaveBeenCalledWith({ name: account.name, roles: ['workflow_reader'] });
    expect(history.location.pathname).toBe('/');
    expect(await screen.findByText(account.name)).toBeVisible();
    expect(list).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
  });

  it('requires a valid name and at least one selected role', async () => {
    const { create } = await renderApp();
    await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());
    fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
      target: { value: '../invalid' },
    });
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Create account' }));

    expect(screen.getByText(/Enter a name of up to/)).toBeVisible();
    expect(screen.getByText('Select at least one role.')).toBeVisible();
    expect(screen.getByTestId('serviceAccountRolesSelector')).toHaveAccessibleName(
      'Set privileges'
    );
    expect(screen.getByTestId('serviceAccountRolesSelector')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('flags an invalid name once the field is touched, before submitting', async () => {
    await renderApp();
    const nameInput = await screen.findByTestId('serviceAccountNameInput');
    fireEvent.change(nameInput, { target: { value: '../invalid' } });
    expect(screen.queryByText(/Enter a name of up to/)).not.toBeInTheDocument();

    fireEvent.blur(nameInput);

    expect(screen.getByText(/Enter a name of up to/)).toBeVisible();
  });

  it('shows custom and built-in roles without preselecting any role', async () => {
    const { getRoles } = await renderApp();
    await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());
    expect(getRoles).toHaveBeenCalledWith({ includeReservedRoles: true });
    fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));

    await waitFor(() => expect(screen.getByText('Custom roles')).toBeVisible());
    expect(screen.getByTestId('roleOption-workflow_reader')).toBeVisible();
    expect(within(screen.getByTestId('roleOption-viewer')).getByText('built-in')).toBeVisible();
    expect(screen.getByTestId('createServiceAccountRoleLink')).toHaveAttribute(
      'href',
      '/app/management/security/roles/edit'
    );
  });

  it('selects roles with the keyboard and returns focus when the menu closes', async () => {
    await renderApp();
    const selector = screen.getByRole('button', { name: 'Set privileges' });
    await waitFor(() => expect(selector).toBeEnabled());
    act(() => selector.focus());
    await user.keyboard('{ArrowDown}');
    const list = await screen.findByRole('listbox', { name: 'Select roles' });
    await waitFor(() => expect(list).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('roleOption-workflow_reader')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(selector).toHaveFocus());
    expect(selector).toHaveTextContent('workflow_reader');
  });

  it('retains form values after a server error and allows retrying', async () => {
    const { create } = await renderApp();
    create.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        request: {},
        body: { message: 'An account with this name already exists.' },
      })
    );
    await fillForm();
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(await screen.findByText('An account with this name already exists.')).toBeVisible();
    expect(screen.getByTestId('serviceAccountNameInput')).toHaveValue(account.name);
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
    expect(create).toHaveBeenCalledTimes(2);
    await waitForElementToBeRemoved(() => screen.queryByTestId('createServiceAccountFlyout'));
  });

  it('blocks duplicate submissions and closing while creation is pending', async () => {
    const { create } = await renderApp();
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('createServiceAccountCancel')).toBeDisabled();
    await act(async () => resolveCreation(account));
  });

  it('does not redirect after leaving while creation is pending', async () => {
    const { create, history, onCreated } = await renderApp();
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
    act(() => history.push('/another-page'));

    await act(async () => resolveCreation(account));

    expect(history.location.pathname).toBe('/another-page');
    expect(onCreated).toHaveBeenCalledWith(account);
  });

  it('refreshes the directory and notifies after navigating Back during creation', async () => {
    const { create, history, list, onCreated } = await renderApp({ pathname: '/' });
    fireEvent.click(await screen.findByTestId('serviceAccountsPageCreateButton'));
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
    act(() => history.goBack());
    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
    list.mockResolvedValue({ serviceAccounts: [{ ...account, enabled: true, assumable: true }] });

    await act(async () => resolveCreation(account));

    expect(history.location.pathname).toBe('/');
    expect(await screen.findByText(account.name)).toBeVisible();
    expect(onCreated).toHaveBeenCalledWith(account);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('does not update an unmounted app after creation completes', async () => {
    const { create, onCreated, unmount, list } = await renderApp();
    let resolveCreation: (value: ServiceAccount) => void = () => {};
    create.mockReturnValue(
      new Promise<ServiceAccount>((resolve) => {
        resolveCreation = resolve;
      })
    );
    await fillForm();
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
    unmount();
    await act(async () => resolveCreation(account));
    expect(onCreated).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it.each([
    { isServerless: true, maxRoles: 50 },
    { isServerless: false, maxRoles: 1000 },
  ])('validates the $maxRoles role limit before submission', async ({ isServerless, maxRoles }) => {
    const roleOptions = Array.from({ length: maxRoles + 1 }, (_, index) => ({
      ...availableRoles[0],
      name: `role_${index}`,
    }));
    const selector = jest
      .spyOn(roleSelector, 'ServiceAccountRoleSelector')
      .mockImplementation(({ onChange }) => (
        <>
          <button onClick={() => onChange(roleOptions.map(({ name }) => name))}>
            Exceed limit
          </button>
          <button onClick={() => onChange(roleOptions.slice(0, maxRoles).map(({ name }) => name))}>
            Select limit
          </button>
        </>
      ));
    try {
      const { create } = await renderApp({ isServerless, roleOptions });
      fireEvent.change(await screen.findByTestId('serviceAccountNameInput'), {
        target: { value: account.name },
      });
      fireEvent.click(screen.getByText('Exceed limit'));
      expect(screen.getByText(`Select no more than ${maxRoles} roles.`)).toBeVisible();
      expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();
      fireEvent.submit(screen.getByRole('form', { name: 'Create account' }));
      expect(create).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Select limit'));
      expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled();
      fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

      await waitForElementToBeRemoved(() => screen.queryByTestId('createServiceAccountFlyout'));
      expect(create).toHaveBeenCalledWith({
        name: account.name,
        roles: roleOptions.slice(0, maxRoles).map(({ name }) => name),
      });
    } finally {
      selector.mockRestore();
    }
  });

  it('bounds rendered options for a large role catalog', async () => {
    await renderApp({
      roleOptions: Array.from({ length: 2000 }, (_, index) => ({
        ...availableRoles[0],
        name: `role_${index}`,
      })),
    });
    const selector = screen.getByTestId('serviceAccountRolesSelector');
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.click(selector);
    await waitFor(() => expect(screen.getByTestId('createServiceAccountRoleLink')).toBeVisible());
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(30);
  });

  it('requires removing roles that disappeared when refreshing the role list', async () => {
    const { create, getRoles } = await renderApp();
    await fillForm();
    getRoles.mockResolvedValue([availableRoles[1]]);
    fireEvent.focus(window);
    expect(await screen.findByText(/Remove roles that are no longer available/)).toBeVisible();
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));
    fireEvent.click(await screen.findByTestId('roleOption-workflow_reader'));
    fireEvent.click(screen.getByTestId('roleOption-viewer'));
    fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));
    await waitForElementToBeRemoved(() => screen.queryByTestId('roleOption-viewer'));
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled();
  });

  it('allows retrying role loading without losing the name', async () => {
    const { getRoles, create } = await renderApp({ pathname: '/' });
    getRoles.mockRejectedValueOnce(new Error('Unavailable'));
    fireEvent.click(await screen.findByTestId('serviceAccountsPageCreateButton'));
    expect(await screen.findByText('Unable to load roles.')).toBeVisible();
    fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
      target: { value: account.name },
    });
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeDisabled();

    fireEvent.click(screen.getByTestId('refreshServiceAccountRolesButton'));

    await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());
    expect(screen.getByTestId('serviceAccountNameInput')).toHaveValue(account.name);
    expect(create).not.toHaveBeenCalled();
  });

  it('cancels without creating or refetching the directory', async () => {
    const { history, create, list } = await renderApp();
    fireEvent.click(screen.getByTestId('createServiceAccountCancel'));

    expect(history.location.pathname).toBe('/');
    expect(create).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('does not open the flyout or load roles without the create capability', async () => {
    const { getRoles } = await renderApp({ canCreate: false });
    await screen.findByTestId('serviceAccountsEmptyPrompt');

    expect(screen.queryByTestId('createServiceAccountFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serviceAccountsPageCreateButton')).not.toBeInTheDocument();
    expect(getRoles).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'explains privileges for the deployment (serverless: %s)',
    async (isServerless) => {
      await renderApp({ isServerless });
      await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());

      await user.hover(screen.getByText('About role privileges'));
      if (isServerless) {
        expect(await screen.findByText(/An account can only use privileges/)).toBeVisible();
        expect(screen.getByText(/For cross-project search/)).toBeVisible();
        expect(screen.queryByText(/The account receives the privileges/)).not.toBeInTheDocument();
      } else {
        expect(await screen.findByText(/The account receives the privileges/)).toBeVisible();
        expect(screen.queryByText(/An account can only use privileges/)).not.toBeInTheDocument();
        expect(screen.queryByText(/For cross-project search/)).not.toBeInTheDocument();
      }
    }
  );

  it('hides create-role navigation without permission', async () => {
    await renderApp({ canCreateRole: false });
    await waitFor(() => expect(screen.getByTestId('serviceAccountRolesSelector')).toBeEnabled());
    fireEvent.click(screen.getByTestId('serviceAccountRolesSelector'));

    await screen.findByText('Custom roles');
    expect(screen.queryByTestId('createServiceAccountRoleLink')).not.toBeInTheDocument();
  });
});
