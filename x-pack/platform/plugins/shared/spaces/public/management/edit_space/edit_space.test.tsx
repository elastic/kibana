/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import {
  httpServiceMock,
  i18nServiceMock,
  loggingSystemMock,
  notificationServiceMock,
  overlayServiceMock,
  scopedHistoryMock,
  themeServiceMock,
} from '@kbn/core/public/mocks';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { asSpaceId } from '@kbn/core-spaces-common';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';

import { EditSpace } from './edit_space';
import { EditSpaceProviderRoot } from './provider/edit_space_provider';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getPrivilegeAPIClientMock } from '../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';
import { getSecurityLicenseMock } from '../security_license.mock';

jest.mock('./edit_space_general_tab', () => ({
  EditSpaceSettingsTab: () => <div />,
}));

jest.mock('./edit_space_roles_tab', () => ({
  EditSpaceAssignedRolesTab: () => <div />,
}));

jest.mock('./edit_space_content_tab', () => ({
  EditSpaceContentTab: () => <div />,
}));

const spaceId = asSpaceId('my-space');
const space = {
  id: spaceId,
  name: 'My Space',
  description: 'A space for tests',
  disabledFeatures: [],
  solution: 'es' as const,
};

const features = [
  new KibanaFeature({
    id: asSpaceId('feature-1'),
    name: 'feature 1',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  }),
];

const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location) => location.pathname ?? '/');

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const userProfile = userProfileServiceMock.createStart();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();
const logger = loggingSystemMock.createLogger();

const neverResolve = <T,>() => new Promise<T>(() => {});

const createRole = (name: string): Role => ({
  name,
  elasticsearch: { cluster: [], run_as: [], indices: [] },
  kibana: [],
});

const renderEditSpace = ({
  spacesManager = spacesManagerMock.create(),
  getFeatures = jest.fn().mockResolvedValue(features),
  getIsRoleManagementEnabled = () => Promise.resolve(() => true),
}: {
  spacesManager?: ReturnType<typeof spacesManagerMock.create>;
  getFeatures?: () => Promise<KibanaFeature[]>;
  getIsRoleManagementEnabled?: () => Promise<() => boolean | undefined>;
} = {}) => {
  return render(
    <IntlProvider locale="en">
      <MockAppHeaderProvider>
        <EditSpaceProviderRoot
          capabilities={{
            navLinks: {},
            management: {},
            catalogue: {},
            spaces: { manage: true },
            roles: { view: true, save: true },
          }}
          getUrlForApp={(appId) => appId}
          navigateToUrl={jest.fn()}
          serverBasePath=""
          spacesManager={spacesManager}
          getRolesAPIClient={getRolesAPIClientMock}
          http={http}
          notifications={notifications}
          overlays={overlays}
          getIsRoleManagementEnabled={getIsRoleManagementEnabled}
          getPrivilegesAPIClient={getPrivilegeAPIClientMock}
          getSecurityLicense={getSecurityLicenseMock}
          userProfile={userProfile}
          theme={theme}
          i18n={i18n}
          logger={logger}
          enableSecurityLink=""
        >
          <EditSpace
            spaceId={spaceId}
            history={history}
            getFeatures={getFeatures}
            onLoadSpace={jest.fn()}
            allowFeatureVisibility
            allowSolutionVisibility
          />
        </EditSpaceProviderRoot>
      </MockAppHeaderProvider>
    </IntlProvider>
  );
};

describe('EditSpace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    history.createHref.mockImplementation((location) => location.pathname ?? '/');
  });

  it('shows a spinner while the space is still loading', () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpace.mockReturnValue(neverResolve());
    spacesManager.getActiveSpace.mockReturnValue(neverResolve());

    renderEditSpace({
      spacesManager,
      getFeatures: neverResolve,
      getIsRoleManagementEnabled: neverResolve,
    });

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Edit space');
    expect(screen.getByTestId('editSpacePageLoading')).toBeInTheDocument();
  });

  it('renders solution and current badges, tabs, and the Permissions role count', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpace.mockResolvedValue(space);
    spacesManager.getActiveSpace.mockResolvedValue(space);
    spacesManager.getRolesForSpace.mockResolvedValue([createRole('viewer'), createRole('editor')]);

    renderEditSpace({ spacesManager });

    await waitFor(() => {
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My Space');
      expect(screen.queryByTestId('editSpacePageLoading')).not.toBeInTheDocument();
      expect(screen.getByTestId('space-solution-badge-es')).toBeInTheDocument();
      expect(screen.getByTestId('space-current-badge')).toHaveTextContent('Current');

      const tabs = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.tabs);
      expect(within(tabs).getByRole('tab', { name: 'General settings' })).toBeInTheDocument();
      expect(within(tabs).getByRole('tab', { name: 'Content' })).toBeInTheDocument();

      const permissionsTab = within(tabs).getByRole('tab', { name: /Permissions/ });
      expect(within(permissionsTab).getByText('2')).toBeInTheDocument();
    });
  });
});
