/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CreateServiceAccountFlyout } from './create_service_account_flyout';

const account = { id: 'account-id', name: 'workflow-runner', roles: ['workflow_reader'] };
const httpError = (status?: number) =>
  Object.assign(new Error('Request failed'), {
    name: 'HttpFetchError',
    request: {},
    response: status ? { status } : undefined,
    body: { message: 'Backend unavailable' },
  });

const renderFlyout = async (error: Error) => {
  const create = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(account);
  const onError = jest.fn();
  const onCreated = jest.fn();
  const onClose = jest.fn();
  renderWithI18n(
    <EuiProvider>
      <CreateServiceAccountFlyout
        isServerless={false}
        serviceAccountsAPIClient={{ create }}
        rolesAPIClient={{
          getRoles: jest.fn().mockResolvedValue([
            {
              name: 'workflow_reader',
              elasticsearch: { cluster: [], indices: [], run_as: [] },
              kibana: [],
              metadata: {},
            },
          ]),
        }}
        onClose={onClose}
        onCreated={onCreated}
        onError={onError}
      />
    </EuiProvider>
  );
  const roles = screen.getByRole('combobox', { name: 'Set privileges' });
  await waitFor(() => expect(roles).toBeEnabled());
  fireEvent.change(screen.getByTestId('serviceAccountNameInput'), {
    target: { value: account.name },
  });
  fireEvent.change(screen.getByTestId('createServiceAccountDescription'), {
    target: { value: 'Reads investigation events.' },
  });
  fireEvent.click(roles);
  fireEvent.click(await screen.findByTestId('roleOption-workflow_reader'));
  fireEvent.keyDown(roles, { key: 'Escape' });
  await act(async () => {
    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));
  });
  return { create, onError, onCreated, onClose };
};

describe('CreateServiceAccountFlyout errors', () => {
  jest.setTimeout(30_000);

  it.each([
    ['forbidden request', httpError(403)],
    ['not found', httpError(404)],
    ['too many requests', httpError(429)],
    ['server error', httpError(500)],
    ['unavailable backend', httpError(503)],
    ['HTTP fetch error without a response', httpError()],
    ['network error', new Error('fetch failed')],
  ])('reports %s through onError and keeps the form ready for retry', async (_, error) => {
    const { create, onError, onCreated, onClose } = await renderFlyout(error);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(error, 'Unable to create "workflow-runner"')
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Please address the highlighted errors.')).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceAccountNameInput')).toHaveValue(account.name);
    expect(screen.getByTestId('createServiceAccountDescription')).toHaveValue(
      'Reads investigation events.'
    );
    expect(screen.getByTestId('serviceAccountRolesSelector')).toHaveTextContent('workflow_reader');
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('createServiceAccountSubmit'));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(account));
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith({
      name: account.name,
      roles: account.roles,
      description: 'Reads investigation events.',
    });
  });

  it.each([400, 409])('keeps an HTTP %s error in the form', async (status) => {
    const { onError, onCreated, onClose } = await renderFlyout(httpError(status));

    expect(await screen.findByText('Backend unavailable')).toBeVisible();
    expect(screen.getByText('Please address the highlighted errors.')).toBeVisible();
    expect(screen.getByTestId('createServiceAccountSubmit')).toBeEnabled();
    expect(onError).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
