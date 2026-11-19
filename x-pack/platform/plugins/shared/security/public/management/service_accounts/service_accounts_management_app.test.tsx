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

import { ServiceAccountsApp } from './service_accounts_app';
import { serviceAccountsManagementApp } from './service_accounts_management_app';
import type { ServiceAccountsAPIClient } from '../../service_accounts';

jest.mock('./service_accounts_app', () => ({
  ServiceAccountsApp: jest.fn(() => 'Service Accounts Page'),
}));

const element = document.body.appendChild(document.createElement('div'));
const serviceAccountsAPIClient = {} as ServiceAccountsAPIClient;

describe('serviceAccountsManagementApp', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renders the application and sets the breadcrumb', async () => {
    const { getStartServices } = coreMock.createSetup();
    const coreStartMock = coreMock.createStart();
    getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
    const setBreadcrumbs = jest.fn();
    const history = scopedHistoryMock.create({ pathname: '/' });

    let unmount: Unmount = noop;
    await act(async () => {
      unmount = await serviceAccountsManagementApp
        .create({
          buildFlavor: 'traditional',
          roleManagementEnabled: true,
          getStartServices,
          serviceAccountsAPIClient,
        })
        .mount({
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

    jest
      .mocked(ServiceAccountsApp)
      .mock.calls.at(-1)?.[0]
      .onCreated({
        id: 'account-id',
        name: 'workflow-runner',
        roles: ['viewer'],
      });
    expect(coreStartMock.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Created service account "workflow-runner"'
    );
    unmount();
  });

  it.each([
    { roleManagementEnabled: true, canSave: true },
    { roleManagementEnabled: false, canSave: true },
    { roleManagementEnabled: true, canSave: false },
  ])(
    'gates role creation on configuration and capability (%j)',
    async ({ roleManagementEnabled, canSave }) => {
      const { getStartServices } = coreMock.createSetup();
      const coreStartMock = coreMock.createStart();
      coreStartMock.application.capabilities = {
        ...coreStartMock.application.capabilities,
        roles: { save: canSave },
      };
      coreStartMock.application.getUrlForApp.mockReturnValue('/app/management/security/roles/edit');
      getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
      let unmount: Unmount = noop;
      await act(async () => {
        unmount = await serviceAccountsManagementApp
          .create({
            buildFlavor: 'traditional',
            roleManagementEnabled,
            getStartServices,
            serviceAccountsAPIClient,
          })
          .mount({
            basePath: '/',
            element,
            setBreadcrumbs: jest.fn(),
            history: scopedHistoryMock.create({ pathname: '/' }),
            theme: coreStartMock.theme,
            theme$: themeServiceMock.createTheme$(),
          });
      });
      expect(jest.mocked(ServiceAccountsApp).mock.calls.at(-1)?.[0].createRoleUrl).toBe(
        roleManagementEnabled && canSave ? '/app/management/security/roles/edit' : undefined
      );
      unmount();
    }
  );

  it('registers under id "service_accounts" with order 35', () => {
    const { getStartServices } = coreMock.createSetup();
    const app = serviceAccountsManagementApp.create({
      buildFlavor: 'traditional',
      roleManagementEnabled: true,
      getStartServices,
      serviceAccountsAPIClient,
    });

    expect(app.id).toBe('service_accounts');
    expect(app.order).toBe(35);
    expect(app.title).toBe('Service accounts');
  });
});
