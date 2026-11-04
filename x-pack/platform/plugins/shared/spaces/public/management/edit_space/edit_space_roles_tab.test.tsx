/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import {
  httpServiceMock,
  i18nServiceMock,
  loggingSystemMock,
  notificationServiceMock,
  overlayServiceMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { EditSpaceAssignedRolesTab } from './edit_space_roles_tab';
import { EditSpaceProviderRoot } from './provider';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getPrivilegeAPIClientMock } from '../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';
import { getSecurityLicenseMock } from '../security_license.mock';

const getUrlForApp = (appId: string) => appId;
const navigateToUrl = jest.fn();
const spacesManager = spacesManagerMock.create();
const getRolesAPIClient = getRolesAPIClientMock;
const getPrivilegeAPIClient = getPrivilegeAPIClientMock;

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const userProfile = userProfileServiceMock.createStart();
const security = securityServiceMock.createStart();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();
const logger = loggingSystemMock.createLogger();

const space = {
  id: asSpaceId('space-a'),
  name: 'Space A',
  disabledFeatures: [],
  _reserved: false,
};

describe('EditSpaceAssignedRolesTab', () => {
  const loadRolesSpy = jest.spyOn(spacesManager, 'getRolesForSpace');
  const toastErrorSpy = jest.spyOn(notifications.toasts, 'addError');

  const TestComponent: React.FC<
    React.PropsWithChildren<{
      getIsRoleManagementEnabled?: () => Promise<() => boolean | undefined>;
    }>
  > = ({ children, ...props }) => {
    const getIsRoleManagementEnabled =
      props.getIsRoleManagementEnabled ?? (() => Promise.resolve(() => undefined));

    return (
      <IntlProvider locale="en">
        <EditSpaceProviderRoot
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
          }}
          getUrlForApp={getUrlForApp}
          navigateToUrl={navigateToUrl}
          serverBasePath=""
          spacesManager={spacesManager}
          getRolesAPIClient={getRolesAPIClient}
          http={http}
          notifications={notifications}
          overlays={overlays}
          getIsRoleManagementEnabled={getIsRoleManagementEnabled}
          getPrivilegesAPIClient={getPrivilegeAPIClient}
          getSecurityLicense={getSecurityLicenseMock}
          userProfile={userProfile}
          security={security}
          theme={theme}
          i18n={i18n}
          logger={logger}
          enableSecurityLink=""
        >
          {children}
        </EditSpaceProviderRoot>
      </IntlProvider>
    );
  };

  beforeEach(() => {
    loadRolesSpy.mockReset();
    toastErrorSpy.mockReset();
  });

  it('loads the assigned roles', async () => {
    act(() => {
      render(
        <TestComponent>
          <EditSpaceAssignedRolesTab space={space} isReadOnly={false} features={[]} />
        </TestComponent>
      );
    });

    await waitFor(() => {
      expect(loadRolesSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error toast if there is an error loading the assigned roles', async () => {
    loadRolesSpy.mockImplementation(() => {
      throw new Error('test error');
    });

    act(() => {
      render(
        <TestComponent>
          <EditSpaceAssignedRolesTab space={space} isReadOnly={false} features={[]} />
        </TestComponent>
      );
    });

    await waitFor(() => {
      expect(loadRolesSpy).toHaveBeenCalledTimes(1);
      expect(toastErrorSpy).toHaveBeenCalledWith(new Error('test error'), {
        title: 'Error: test error',
      });
    });
  });

  it('does not load roles if role management is not enabled', async () => {
    const getIsRoleManagementEnabled = () => Promise.resolve(() => false);

    act(() => {
      render(
        <TestComponent getIsRoleManagementEnabled={getIsRoleManagementEnabled}>
          <EditSpaceAssignedRolesTab space={space} isReadOnly={false} features={[]} />
        </TestComponent>
      );
    });

    await waitFor(() => {
      expect(loadRolesSpy).not.toHaveBeenCalled();
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });
  });

  it('warns about the service accounts holding a role before removing it from the space', async () => {
    const role = {
      name: 'test-role',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [{ base: ['all'], feature: {}, spaces: [space.id] }],
    };
    loadRolesSpy.mockResolvedValue([role]);
    security.serviceAccounts.isEnabled.mockReturnValue(true);
    security.serviceAccounts.findByRoles.mockResolvedValue({
      serviceAccounts: [{ id: 'kibana/relay', name: 'relay', roles: ['test-role'], enabled: true }],
      complete: true,
    });

    render(
      <TestComponent getIsRoleManagementEnabled={() => Promise.resolve(() => true)}>
        <EditSpaceAssignedRolesTab space={space} isReadOnly={false} features={[]} />
      </TestComponent>
    );

    fireEvent.click(await screen.findByTestId('spaceRoleCellDeleteAction'));

    const modal = await screen.findByRole('alertdialog');
    const callout = await within(modal).findByTestId('serviceAccountRoleUsageCallout');
    expect(callout).toHaveTextContent('1 service account uses this role');
    expect(within(callout).getByText('relay')).toBeInTheDocument();
    expect(security.serviceAccounts.findByRoles).toHaveBeenCalledWith(['test-role']);
  });
});
