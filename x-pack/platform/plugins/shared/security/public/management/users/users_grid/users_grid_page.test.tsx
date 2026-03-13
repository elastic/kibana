/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { LocationDescriptorObject } from 'history';
import React from 'react';

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { UsersGridPage } from './users_grid_page';
import { rolesAPIClientMock } from '../../roles/index.mock';
import { userAPIClientMock } from '../index.mock';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('UsersGridPage', () => {
  let history: ScopedHistory;
  let coreStart: CoreStart;

  beforeEach(() => {
    history = scopedHistoryMock.create();
    history.createHref = (location: LocationDescriptorObject) => {
      return `${location.pathname}${location.search ? '?' + location.search : ''}`;
    };
    coreStart = coreMock.createStart();
  });

  it('renders the list of users and create button', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
      {
        username: 'reserved',
        email: 'reserved@bar.net',
        full_name: '',
        roles: ['superuser'],
        enabled: true,
        metadata: { _reserved: true },
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      expect(apiClientMock.getUsers).toHaveBeenCalledTimes(1);
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.getByText('reserved')).toBeInTheDocument();
      expect(screen.queryByTestId('userDisabled')).not.toBeInTheDocument();
      expect(screen.getByTestId('createUserButton')).toBeInTheDocument();
    });
  });

  it('renders the loading indication on the table when fetching user with data', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
      {
        username: 'reserved',
        email: 'reserved@bar.net',
        full_name: '',
        roles: ['superuser'],
        enabled: true,
        metadata: { _reserved: true },
      },
    ]);

    const { container } = renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.euiBasicTable-loading')).not.toBeInTheDocument();
    });
  });

  it('renders the loading indication on the table when fetching user with no data', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([]);

    const { container } = renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.euiBasicTable-loading')).not.toBeInTheDocument();
    });
  });

  it('generates valid links when usernames contain special characters', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'username with some fun characters!@#$%^&*()',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      const link = screen.getByTestId('userRowUserName');
      expect(link).toHaveAttribute(
        'href',
        '/edit/username%20with%20some%20fun%20characters!%40%23%24%25%5E%26*()'
      );
    });
  });

  it('renders a forbidden message if user is not authorized', async () => {
    const apiClient = userAPIClientMock.create();
    apiClient.getUsers.mockRejectedValue({ body: { statusCode: 403 } });

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClient}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      expect(apiClient.getUsers).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('permissionDeniedMessage')).toBeInTheDocument();
    });
  });

  it('renders disabled users', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: false,
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('userDisabled')).toBeInTheDocument();
    });
  });

  it('renders deprecated users', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
        metadata: {
          _reserved: true,
          _deprecated: true,
          _deprecated_reason: 'This user is not cool anymore.',
        },
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('userDeprecated')).toBeInTheDocument();
    });
  });

  it('renders a warning when a user is assigned a deprecated role', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
      {
        username: 'reserved',
        email: 'reserved@bar.net',
        full_name: '',
        roles: ['superuser'],
        enabled: true,
        metadata: { _reserved: true },
      },
    ]);

    const roleAPIClientMock = rolesAPIClientMock.create();
    roleAPIClientMock.getRoles.mockResolvedValue([
      {
        name: 'kibana_user',
        metadata: {
          _deprecated: true,
          _deprecated_reason: "I don't like you.",
        },
      },
    ]);

    const { container } = renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={roleAPIClientMock}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    // EuiToolTip renders data-test-subj on the portal tooltip, not the anchor element,
    // so check for the warning icon rendered inside the tooltip anchor instead.
    await waitFor(() => {
      expect(screen.getByText('kibana_user')).toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="warning"]')).toBeInTheDocument();
    });
  });

  it('hides reserved users when instructed to', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
      {
        username: 'reserved',
        email: 'reserved@bar.net',
        full_name: '',
        roles: ['superuser'],
        enabled: true,
        metadata: { _reserved: true },
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.getByText('reserved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('showReservedUsersSwitch'));

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.queryByText('reserved')).not.toBeInTheDocument();
    });
  });

  it('hides controls when readOnly is enabled', async () => {
    const apiClientMock = userAPIClientMock.create();
    apiClientMock.getUsers.mockResolvedValue([
      {
        username: 'foo',
        email: 'foo@bar.net',
        full_name: 'foo bar',
        roles: ['kibana_user'],
        enabled: true,
      },
    ]);

    renderWithIntl(
      <UsersGridPage
        userAPIClient={apiClientMock}
        rolesAPIClient={rolesAPIClientMock.create()}
        notifications={coreStart.notifications}
        history={history}
        navigateToApp={coreStart.application.navigateToApp}
        readOnly
      />
    );

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('createUserButton')).not.toBeInTheDocument();
  });
});
