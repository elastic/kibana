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
import type { ServiceAccountPickerProps } from '.';

const account = {
  id: 'reader-id',
  name: 'Investigation reader',
  description: 'Reads investigation events.',
  roles: ['viewer'],
  enabled: true,
  assumable: true,
};

const setup = (enabled = true, canManage = true, canCreate = true) => {
  const core = coreMock.createStart();
  core.security.serviceAccounts.isEnabled.mockReturnValue(enabled);
  core.security.serviceAccounts.canCreate.mockReturnValue(canCreate);
  core.application.capabilities = {
    ...core.application.capabilities,
    management: { security: { service_accounts: canManage } },
  };
  core.application.getUrlForApp.mockReturnValue('/app/management/security/service_accounts');
  core.http.get.mockResolvedValue({ serviceAccounts: [account] });
  const uiApi = getUiApi({ core });
  const onSelect = jest.fn();
  const render = async (props: Partial<ServiceAccountPickerProps> = {}) => {
    await act(async () => {
      renderWithI18n(
        <EuiProvider>
          {uiApi.components.getServiceAccountPicker({ onSelect, ...props })}
        </EuiProvider>
      );
    });
  };
  return { core, onSelect, render };
};

describe('getServiceAccountPicker UI API', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = jest.fn();
  });
  it('loads accounts for an ordinary consumer and selects their stable ID', async () => {
    const { core, onSelect, render } = setup();
    await render({ selectedId: account.id });
    const option = await screen.findByRole('option', { name: /Investigation reader/ });
    expect(option).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(account.description)).toBeVisible();
    expect(screen.getByText('viewer')).toBeVisible();
    expect(screen.getByRole('link', { name: /Manage/ })).toHaveAttribute(
      'href',
      '/app/management/security/service_accounts'
    );
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(account);
    expect(core.http.get).toHaveBeenCalledWith('/internal/security/service_account', {
      query: { limit: 100 },
    });
  });

  it('does not render or fetch with the feature flag disabled', async () => {
    const { core, render } = setup(false);
    await render();
    expect(core.http.get).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('hides management actions without capabilities', async () => {
    const { render } = setup(true, false, false);
    await render();
    expect(await screen.findByRole('option')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Manage/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('uses the supplied directory without another request and supports keyboard selection', async () => {
    const { core, render, onSelect } = setup();
    const next = { ...account, id: 'second-id', name: 'Second reader' };
    const onClose = jest.fn();
    await render({
      directory: { accounts: [account, next], status: 'ready', onRetry: jest.fn() },
      onClose,
    });
    const first = await screen.findByRole('option', { name: /Investigation reader/ });
    act(() => first.focus());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(next);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('filters ineligible accounts and loads subsequent pages without duplicates', async () => {
    const { core, render } = setup();
    core.http.get
      .mockResolvedValueOnce({
        serviceAccounts: [
          account,
          { ...account, id: 'disabled', name: 'Disabled', enabled: false },
          { ...account, id: 'denied', name: 'Denied', assumable: false },
        ],
        nextPage: 'cursor',
      })
      .mockResolvedValueOnce({
        serviceAccounts: [account, { ...account, id: 'second', name: 'Second reader' }],
      });
    await render();
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    await user.click(screen.getByRole('option', { name: 'Load more service accounts' }));
    expect(await screen.findByRole('option', { name: /Second reader/ })).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(core.http.get).toHaveBeenLastCalledWith('/internal/security/service_account', {
      query: { limit: 100, after: 'cursor' },
    });
  });

  it('reports restricted access without exposing management actions', async () => {
    const { core, render } = setup();
    core.http.get.mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        request: new Request('http://localhost'),
        response: new Response(null, { status: 403 }),
      })
    );
    await render();
    expect(await screen.findByText(/Ask your administrator for access/)).toBeVisible();
    expect(screen.queryByRole('link', { name: /Manage/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
  });

  it('distinguishes a failed request from an empty directory and allows retry', async () => {
    const { core, render } = setup();
    core.http.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ serviceAccounts: [] });
    await render();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load service accounts.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No service accounts available.')).toBeVisible();
  });

  it('creates through the shared flyout, refreshes the directory, and selects the result', async () => {
    const { core, render, onSelect } = setup();
    const created = { id: 'created-id', name: 'new-account', roles: ['viewer'] };
    core.security.serviceAccounts.create.mockResolvedValue(created);
    core.http.get
      .mockResolvedValueOnce({ serviceAccounts: [account] })
      .mockResolvedValueOnce([
        {
          name: 'viewer',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [],
          metadata: { _reserved: true },
        },
      ])
      .mockResolvedValueOnce({
        serviceAccounts: [account, { ...created, enabled: true, assumable: true }],
      });
    await render();
    await user.click(await screen.findByRole('button', { name: 'Create account' }));
    const selector = await screen.findByRole('button', { name: 'Set privileges' });
    await waitFor(() => expect(selector).toBeEnabled());
    fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
      target: { value: created.name },
    });
    await user.click(selector);
    await user.click(await screen.findByTestId('roleOption-viewer'));
    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('createServiceAccountSubmit'));
    expect(onSelect).toHaveBeenCalledWith({ ...created, enabled: true, assumable: true });
    expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Created service account "new-account"'
    );
    expect(core.http.get).toHaveBeenNthCalledWith(3, '/internal/security/service_account', {
      query: { limit: 100 },
    });
  });
});
