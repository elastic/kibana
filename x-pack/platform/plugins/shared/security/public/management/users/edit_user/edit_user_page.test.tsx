/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { coreMock } from '@kbn/core/public/mocks';

import { EditUserPage } from './edit_user_page';
import { securityMock } from '../../../mocks';
import { Providers } from '../users_management_app';

const userMock = {
  username: 'jdoe',
  full_name: '',
  email: '',
  enabled: true,
  roles: ['superuser'],
};

describe('EditUserPage', () => {
  const coreStart = coreMock.createStart();
  let history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
  const authc = securityMock.createSetup().authc;

  beforeEach(() => {
    history = createMemoryHistory({ initialEntries: ['/edit/jdoe'] });
    authc.getCurrentUser.mockClear();
    coreStart.http.delete.mockClear();
    coreStart.http.get.mockClear();
    coreStart.http.post.mockClear();
    coreStart.notifications.toasts.addDanger.mockClear();
    coreStart.notifications.toasts.addSuccess.mockClear();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      users: {
        save: true,
      },
    };
  });

  it('keeps the header and shows a loading body while the user is loading', async () => {
    coreStart.http.get.mockReturnValue(new Promise(() => {}));

    render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        userMock.username
      );
      expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
    });
  });

  it('warns when viewing deactivated user', async () => {
    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      enabled: false,
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByText, findByTestId } = render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await findByText(/User has been deactivated/i);
    await findByTestId(APP_HEADER_TEST_SUBJECTS.back);
    await findByTestId('userFormAvatar');
  });

  it('warns when viewing deprecated user', async () => {
    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      metadata: {
        _reserved: true,
        _deprecated: true,
        _deprecated_reason: 'Use [new_user] instead.',
      },
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByText, findByTestId } = render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await findByText(/User is deprecated/i);
    await findByText(/Use .new_user. instead/i);
    expect(await findByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute('href', '/');
  });

  it('warns when viewing built-in user', async () => {
    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      metadata: { _reserved: true, _deprecated: false },
    });
    coreStart.http.get.mockResolvedValueOnce([]);

    const { findByText, findByTestId } = render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await findByText(/User is built in/i);
    expect(await findByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute('href', '/');
  });

  it('warns when selecting deprecated role', async () => {
    coreStart.http.get.mockResolvedValueOnce({
      ...userMock,
      enabled: false,
      roles: ['deprecated_role'],
    });
    coreStart.http.get.mockResolvedValueOnce([
      {
        name: 'deprecated_role',
        metadata: {
          _reserved: true,
          _deprecated: true,
          _deprecated_reason: 'Use [new_role] instead.',
        },
      },
    ]);

    const { findByText, findByTestId } = render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await findByText(/Role .deprecated_role. is deprecated. Use .new_role. instead/i);
    await findByTestId(APP_HEADER_TEST_SUBJECTS.back);
  });

  it('disables form when viewing with readonly privileges', async () => {
    coreStart.http.get.mockResolvedValueOnce(userMock);
    coreStart.http.get.mockResolvedValueOnce([]);
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      users: {
        save: false,
      },
    };

    const { findAllByRole, findByTestId } = render(
      coreStart.rendering.addContext(
        <MockAppHeaderProvider>
          <Providers services={coreStart} authc={authc} history={history}>
            <EditUserPage username={userMock.username} />
          </Providers>
        </MockAppHeaderProvider>
      )
    );

    await findByTestId(APP_HEADER_TEST_SUBJECTS.back);

    const fields = await findAllByRole('textbox');
    expect(fields.length).toBeGreaterThanOrEqual(1);
    fields.forEach((field) => {
      expect(field).toHaveProperty('disabled', true);
    });
  });
});
