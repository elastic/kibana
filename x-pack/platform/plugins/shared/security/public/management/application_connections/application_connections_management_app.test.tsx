/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { noop } from 'lodash';

import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import type { Unmount } from '@kbn/management-plugin/public/types';

import { applicationConnectionsManagementApp } from './application_connections_management_app';
import { mockAuthenticatedUser } from '../../../common/model/authenticated_user.mock';
import { securityMock } from '../../mocks';

const element = document.body.appendChild(document.createElement('div'));

describe('applicationConnectionsManagementApp', () => {
  it('renders the application and sets the breadcrumb', async () => {
    const { getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const { authc } = securityMock.createSetup();
    authc.getCurrentUser.mockResolvedValue(mockAuthenticatedUser());
    const setBreadcrumbs = jest.fn();
    const history = scopedHistoryMock.create({ pathname: '/' });

    coreStartMock.http.get.mockResolvedValue({ clients: [], connections: [] });

    let unmount: Unmount = noop;
    await act(async () => {
      unmount = await applicationConnectionsManagementApp
        .create({ authc, getStartServices })
        .mount({
          basePath: '/',
          element,
          setBreadcrumbs,
          history,
          theme: coreStartMock.theme,
          theme$: themeServiceMock.createTheme$(),
        });
    });

    expect(setBreadcrumbs).toHaveBeenLastCalledWith([{ text: 'Application connections' }]);

    unmount();
  });

  it('registers under id "application_connections" with order 25', () => {
    const { getStartServices } = coreMock.createSetup();
    const { authc } = securityMock.createSetup();
    const app = applicationConnectionsManagementApp.create({ authc, getStartServices });

    expect(app.id).toBe('application_connections');
    expect(app.order).toBe(25);
    expect(app.title).toBe('Application connections');
  });
});
