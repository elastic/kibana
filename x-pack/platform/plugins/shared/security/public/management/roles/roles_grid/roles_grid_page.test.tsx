/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import type { QueryRolesResult } from '@kbn/security-plugin-types-common';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { RolesGridPage } from './roles_grid_page';
import { rolesAPIClientMock } from '../index.mock';
import type { RolesAPIClient } from '../roles_api_client';

const renderWithIntl = (ui: React.ReactElement) =>
  render(
    <MockAppHeaderProvider>
      <I18nProvider>{ui}</I18nProvider>
    </MockAppHeaderProvider>
  );

describe('<RolesGridPage />', () => {
  let apiClientMock: jest.Mocked<PublicMethodsOf<RolesAPIClient>>;
  let history: ReturnType<typeof scopedHistoryMock.create>;
  const { userProfile, theme, i18n, analytics, notifications, rendering } = coreMock.createStart();

  beforeEach(() => {
    history = scopedHistoryMock.create();
    history.createHref.mockImplementation((location) => location.pathname!);

    apiClientMock = rolesAPIClientMock.create();
    apiClientMock.queryRoles.mockResolvedValue({
      total: 5,
      count: 5,
      roles: [
        {
          name: 'test-role-1',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], spaces: [], feature: {} }],
        },
        {
          name: 'test-role-with-description',
          description: 'role-description',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], spaces: [], feature: {} }],
        },
        {
          name: 'reserved-role',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], spaces: [], feature: {} }],
          metadata: { _reserved: true },
        },
        {
          name: 'disabled-role',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], spaces: [], feature: {} }],
          transient_metadata: { enabled: false },
        },
        {
          name: 'special%chars%role',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], spaces: [], feature: {} }],
        },
      ],
    });
  });

  const renderGrid = () =>
    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor="traditional"
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

  it.each(['search', 'reserved filter'])(
    'resets pagination when changing the %s',
    async (change) => {
      apiClientMock.queryRoles.mockResolvedValue({ total: 100, count: 0, roles: [] });
      renderGrid();
      await screen.findByTestId('rolesTable');
      fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
      await waitFor(() =>
        expect(apiClientMock.queryRoles).toHaveBeenLastCalledWith(
          expect.objectContaining({ from: 25 })
        )
      );
      if (change === 'search') {
        fireEvent.change(screen.getByTestId('searchRoles'), { target: { value: 'new query' } });
      } else {
        fireEvent.click(screen.getByTestId('showReservedRolesSwitch'));
      }
      await waitFor(() =>
        expect(apiClientMock.queryRoles).toHaveBeenLastCalledWith(
          expect.objectContaining({ from: 0 })
        )
      );
    }
  );

  it('keeps loading until the newest request completes', async () => {
    const first = Promise.withResolvers<QueryRolesResult>();
    const second = Promise.withResolvers<QueryRolesResult>();
    apiClientMock.queryRoles.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderGrid();
    fireEvent.click(screen.getByTestId('showReservedRolesSwitch'));
    await act(async () => first.resolve({ total: 0, count: 0, roles: [] }));
    expect(screen.getByTestId('rolesTableLoading')).toBeInTheDocument();
    await act(async () => second.resolve({ total: 0, count: 0, roles: [] }));
    expect(screen.getByTestId('rolesTable')).toBeInTheDocument();
  });

  it.each(['success', 'forbidden', 'failure'])(
    'ignores an obsolete request finishing with %s after newer results',
    async (outcome) => {
      const first = Promise.withResolvers<QueryRolesResult>();
      const second = Promise.withResolvers<QueryRolesResult>();
      apiClientMock.queryRoles
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      notifications.toasts.addDanger.mockClear();
      renderGrid();
      fireEvent.click(screen.getByTestId('showReservedRolesSwitch'));
      await act(async () =>
        second.resolve({
          total: 1,
          count: 1,
          roles: [
            {
              name: 'latest-role',
              kibana: [],
              elasticsearch: { cluster: [], indices: [], run_as: [] },
            },
          ],
        })
      );
      await act(async () => {
        if (outcome === 'success') {
          first.resolve({ total: 0, count: 0, roles: [] });
        } else {
          first.reject({ body: { statusCode: outcome === 'forbidden' ? 403 : 500 } });
        }
      });
      expect(screen.getByText('latest-role')).toBeInTheDocument();
      expect(screen.getByTestId('rolesTable')).toBeInTheDocument();
      expect(screen.queryByTestId('permissionDeniedMessage')).not.toBeInTheDocument();
      expect(notifications.toasts.addDanger).not.toHaveBeenCalled();
    }
  );

  it('renders reserved roles as such', async () => {
    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('permissionDeniedMessage')).not.toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
    });
    expect(screen.getByTestId('createRoleButton')).toBeInTheDocument();
    expect(screen.getByTestId('showReservedRolesSwitch')).toBeInTheDocument();
  });

  it('renders disabled roles as such', async () => {
    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('permissionDeniedMessage')).not.toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('renders permission denied if required', async () => {
    apiClientMock.queryRoles.mockRejectedValue({ body: { statusCode: 403 } });

    const { container } = renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('permissionDeniedMessage')).toBeInTheDocument();
    });
    expect(container.children[0]).toMatchSnapshot();
  });

  it('renders role actions as appropriate, escaping when necessary', async () => {
    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    await waitFor(() => {
      const editButton = screen.getByTestId('edit-role-action-test-role-1');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveAttribute('href', '/edit/test-role-1');

      const editSpecialButton = screen.getByTestId('edit-role-action-special%chars%role');
      expect(editSpecialButton).toBeInTheDocument();
      expect(editSpecialButton).toHaveAttribute('href', '/edit/special%25chars%25role');

      const cloneButton = screen.getByTestId('clone-role-action-test-role-1');
      expect(cloneButton).toBeInTheDocument();
      expect(cloneButton).toHaveAttribute('href', '/clone/test-role-1');

      const cloneSpecialButton = screen.getByTestId('clone-role-action-special%chars%role');
      expect(cloneSpecialButton).toBeInTheDocument();
      expect(cloneSpecialButton).toHaveAttribute('href', '/clone/special%25chars%25role');

      expect(screen.getByTestId('edit-role-action-disabled-role')).toBeInTheDocument();
      expect(screen.getByTestId('clone-role-action-disabled-role')).toBeInTheDocument();
      expect(
        screen.getByTestId('roleRowDescription-test-role-with-description')
      ).toBeInTheDocument();
    });
  });

  it('hides controls when readOnly is enabled', async () => {
    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
        readOnly
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test-role-1')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('createRoleButton')).not.toBeInTheDocument();
  });

  it('hides the create action until the first load settles', async () => {
    let resolveRoles: (value: Awaited<ReturnType<typeof apiClientMock.queryRoles>>) => void;
    apiClientMock.queryRoles.mockReturnValue(
      new Promise((resolve) => {
        resolveRoles = resolve;
      })
    );

    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    expect(screen.queryByTestId('createRoleButton')).not.toBeInTheDocument();

    resolveRoles!({
      total: 0,
      count: 0,
      roles: [],
    });

    await waitFor(() => {
      expect(screen.getByTestId('createRoleButton')).toBeInTheDocument();
    });
  });

  it('shows the create action after a non-403 load error', async () => {
    apiClientMock.queryRoles.mockRejectedValue({
      body: { statusCode: 500, message: 'boom' },
    });

    renderWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={notifications}
        i18n={i18n}
        buildFlavor={'traditional'}
        analytics={analytics}
        theme={theme}
        userProfile={userProfile}
        rendering={rendering}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('createRoleButton')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('permissionDeniedMessage')).not.toBeInTheDocument();
  });
});
