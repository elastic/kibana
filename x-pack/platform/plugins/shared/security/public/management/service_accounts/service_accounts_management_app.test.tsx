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

import { serviceAccountsManagementApp } from './service_accounts_management_app';

jest.mock('./service_accounts_page', () => ({
  ServiceAccountsPage: () => 'Service Accounts Page',
}));

const element = document.body.appendChild(document.createElement('div'));

describe('serviceAccountsManagementApp', () => {
  it('renders the application and sets the breadcrumb', async () => {
    const { getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const setBreadcrumbs = jest.fn();
    const history = scopedHistoryMock.create({ pathname: '/' });

    let unmount: Unmount = noop;
    await act(async () => {
      unmount = await serviceAccountsManagementApp.create({ getStartServices }).mount({
        basePath: '/',
        element,
        setBreadcrumbs,
        history,
        theme: coreStartMock.theme,
        theme$: themeServiceMock.createTheme$(),
      });
    });

    expect(setBreadcrumbs).toHaveBeenLastCalledWith([{ text: 'Service accounts' }]);
    expect(coreStartMock.security.serviceAccounts.canCreate).toHaveBeenCalledTimes(1);
    expect(element).toHaveTextContent('Service Accounts Page');

    unmount();
  });

  it('registers under id "service_accounts" with order 35', () => {
    const { getStartServices } = coreMock.createSetup();
    const app = serviceAccountsManagementApp.create({ getStartServices });

    expect(app.id).toBe('service_accounts');
    expect(app.order).toBe(35);
    expect(app.title).toBe('Service accounts');
  });
});
