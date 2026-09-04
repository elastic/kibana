/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { BuildFlavor } from '@kbn/config';
import type { Capabilities } from '@kbn/core/public';
import { CoreScopedHistory } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { REMOTE_CLUSTERS_PATH } from '@kbn/remote-clusters-plugin/public';
import { createRawKibanaPrivileges } from '@kbn/security-role-management-model/src/__fixtures__';
import type { Space } from '@kbn/spaces-plugin/public';
import { spacesManagerMock } from '@kbn/spaces-plugin/public/spaces_manager/mocks';
import { getUiApi } from '@kbn/spaces-plugin/public/ui_api';

import { EditRolePage } from './edit_role_page';
import type { Role } from '../../../../common';
import { licenseMock } from '../../../../common/licensing/index.mock';
import { userAPIClientMock } from '../../users/index.mock';
import { indicesAPIClientMock, privilegesAPIClientMock, rolesAPIClientMock } from '../index.mock';

const MockedElasticsearchPrivileges = jest.fn();
jest.mock('./privileges', () => {
  const actual = jest.requireActual('./privileges');
  return {
    ...actual,
    ElasticsearchPrivileges: (props: any) => {
      MockedElasticsearchPrivileges(props);
      return (
        <div data-test-subj="elasticsearchPrivilegesMock">
          <div data-test-subj="indexPrivileges-indices" />
          {props.canUseRemoteIndices && <div data-test-subj="indexPrivileges-remote_indices" />}
        </div>
      );
    },
  };
});

jest.mock('./privileges/kibana/simple_privilege_section', () => ({
  SimplePrivilegeSection: () => <div data-test-subj="simplePrivilegeSectionMock" />,
}));

jest.mock('./privileges/kibana/space_aware_privilege_section', () => ({
  SpaceAwarePrivilegeSection: ({ uiCapabilities }: any) => (
    <div data-test-subj="spaceAwarePrivilegeSectionMock">
      {!uiCapabilities?.spaces?.manage && <div data-test-subj="userCannotManageSpacesCallout" />}
    </div>
  ),
}));

jest.mock('./privileges/kibana/transform_error_section', () => ({
  TransformErrorSection: () => <div data-test-subj="transformErrorSectionMock" />,
}));

const spacesManager = spacesManagerMock.create();
const { getStartServices } = coreMock.createSetup();
const spacesApiUi = getUiApi({ spacesManager, getStartServices });

const buildFeatures = () => {
  return [
    new KibanaFeature({
      id: 'feature1',
      name: 'Feature 1',
      app: ['feature1App'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          app: ['feature1App'],
          ui: ['feature1-ui'],
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          app: ['feature1App'],
          ui: ['feature1-ui'],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    }),
    new KibanaFeature({
      id: 'feature2',
      name: 'Feature 2',
      app: ['feature2App'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          app: ['feature2App'],
          ui: ['feature2-ui'],
          savedObject: {
            all: ['feature2'],
            read: ['config'],
          },
        },
        read: {
          app: ['feature2App'],
          ui: ['feature2-ui'],
          savedObject: {
            all: [],
            read: ['config'],
          },
        },
      },
    }),
  ] as KibanaFeature[];
};

const buildBuiltinESPrivileges = () => {
  return {
    cluster: ['all', 'manage', 'monitor'],
    index: ['all', 'read', 'write', 'index'],
  };
};

const buildUICapabilities = (canManageSpaces = true) => {
  return {
    catalogue: {},
    management: {},
    navLinks: {},
    spaces: {
      manage: canManageSpaces,
    },
  } as Capabilities;
};

const buildSpaces = () => {
  return [
    {
      id: 'default',
      name: 'Default',
      disabledFeatures: [],
      _reserved: true,
    },
    {
      id: 'space_1',
      name: 'Space 1',
      disabledFeatures: [],
    },
    {
      id: 'space_2',
      name: 'Space 2',
      disabledFeatures: ['feature2'],
    },
  ] as Space[];
};

const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <MockAppHeaderProvider>
    <I18nProvider>{children}</I18nProvider>
  </MockAppHeaderProvider>
);

const expectReadOnlyFormButtons = () => {
  expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  expect(screen.queryByTestId('roleFormReturnButton')).not.toBeInTheDocument();
  expect(screen.queryByTestId('roleFormSaveButton')).not.toBeInTheDocument();
};

const expectSaveFormButtons = () => {
  expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  expect(screen.queryByTestId('roleFormReturnButton')).not.toBeInTheDocument();
  expect(screen.queryByTestId('roleFormSaveButton')).toBeInTheDocument();
};

function getProps({
  action,
  role,
  canManageSpaces = true,
  spacesEnabled = true,
  canUseRemoteIndices = true,
  buildFlavor = 'traditional',
}: {
  action: 'edit' | 'clone';
  role?: Role;
  canManageSpaces?: boolean;
  spacesEnabled?: boolean;
  canUseRemoteIndices?: boolean;
  buildFlavor?: BuildFlavor;
}) {
  const rolesAPIClient = rolesAPIClientMock.create();
  rolesAPIClient.getRole.mockResolvedValue(role);

  const dataViews = dataViewPluginMocks.createStartContract();
  // `undefined` titles can technically happen via import/export or other manual manipulation
  dataViews.getTitles = jest.fn().mockResolvedValue(['foo*', 'bar*', undefined]);

  const indicesAPIClient = indicesAPIClientMock.create();

  const userAPIClient = userAPIClientMock.create();
  userAPIClient.getUsers.mockResolvedValue([]);

  const privilegesAPIClient = privilegesAPIClientMock.create();
  privilegesAPIClient.getAll.mockResolvedValue(createRawKibanaPrivileges(buildFeatures()));
  privilegesAPIClient.getBuiltIn.mockResolvedValue(buildBuiltinESPrivileges());

  const license = licenseMock.create();
  license.getFeatures.mockReturnValue({
    allowRoleDocumentLevelSecurity: true,
    allowRoleFieldLevelSecurity: true,
  } as any);

  const { fatalErrors } = coreMock.createSetup();
  const { http, docLinks, notifications, overlays, rendering } = coreMock.createStart();
  http.get.mockImplementation(async (path: any) => {
    if (path === '/api/spaces/space') {
      if (!spacesEnabled) {
        throw { response: { status: 404 } }; // eslint-disable-line no-throw-literal
      }
      return buildSpaces();
    }
    if (path === '/internal/security/_check_security_features') {
      return { canUseRemoteIndices };
    }
    if (path === REMOTE_CLUSTERS_PATH) {
      return [];
    }
  });
  const analyticsMock = analyticsServiceMock.createAnalyticsServiceStart();
  const i18nMock = i18nServiceMock.createStartContract();
  const themeMock = themeServiceMock.createStartContract();
  const userProfileMock = userProfileServiceMock.createStart();

  return {
    action,
    roleName: role?.name,
    license,
    http,
    dataViews,
    indicesAPIClient,
    privilegesAPIClient,
    rolesAPIClient,
    userAPIClient,
    getFeatures: () => Promise.resolve(buildFeatures()),
    notifications,
    docLinks,
    fatalErrors,
    uiCapabilities: buildUICapabilities(canManageSpaces),
    history: (() => {
      const history = scopedHistoryMock.create();
      history.createHref.mockImplementation((location) => location.pathname ?? '/');
      return history;
    })(),
    overlays,
    navigateToUrl: jest.fn(),
    spacesApiUi,
    buildFlavor,
    userProfile: userProfileMock,
    theme: themeMock,
    i18n: i18nMock,
    analytics: analyticsMock,
    rendering,
  };
}

describe('<EditRolePage />', () => {
  const coreStart = coreMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      roles: {
        save: true,
      },
    };
  });

  describe('with spaces enabled', () => {
    it('keeps the header and shows a loading body while the page loads', async () => {
      const props = getProps({
        action: 'edit',
        role: {
          name: 'my custom role',
          metadata: {},
          elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
          kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
        },
      });
      props.rolesAPIClient.getRole.mockReturnValue(new Promise(() => {}));

      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
          'Viewing role'
        );
        expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('roleFormNameInput')).not.toBeInTheDocument();
    });

    it('can render readonly view when not enough privileges', async () => {
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        roles: {
          save: false,
        },
      };

      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expectReadOnlyFormButtons();
    });

    it('can render a reserved role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                role: {
                  name: 'superuser',
                  metadata: { _reserved: true },
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('reservedRoleBadge')).toHaveTextContent('Reserved');
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
        'Reserved roles are built-in and cannot be removed or modified.'
      );
      expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectReadOnlyFormButtons();
    });

    it('can render a user defined role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
        'Set privileges on your Elasticsearch data and control access to your Kibana spaces.'
      );
      expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('can render when creating a new role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...getProps({ action: 'edit' })} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(false);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('redirects back to roles when creating a new role without privileges', async () => {
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        roles: {
          save: false,
        },
      };

      const props = getProps({ action: 'edit' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(props.history.push).toHaveBeenCalledWith('/');
    });

    it('can render when cloning an existing role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                role: {
                  name: '',
                  metadata: { _reserved: false },
                  elasticsearch: {
                    cluster: ['all', 'manage'],
                    indices: [
                      {
                        names: ['foo*'],
                        privileges: ['all'],
                        field_security: { except: ['f'], grant: ['b*'] },
                      },
                    ],
                    run_as: ['elastic'],
                  },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(false);
      expectSaveFormButtons();
    });

    it('renders an auth error when not authorized to manage spaces', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                canManageSpaces: false,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.queryByTestId('reservedRoleBadge')).not.toBeInTheDocument();

      expect(screen.getByTestId('userCannotManageSpacesCallout')).toBeInTheDocument();

      expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('renders a partial read-only view when there is a transform error', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                canManageSpaces: false,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [],
                  _transform_error: [{ reason: 'kibana:reserved_privileges_mixed', state: [] }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('transformErrorSectionMock')).toBeInTheDocument();
      expectReadOnlyFormButtons();
    });
  });

  describe('with spaces disabled', () => {
    it('can render readonly view when not enough privileges', async () => {
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        roles: {
          save: false,
        },
      };

      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expectReadOnlyFormButtons();
    });

    it('can render a reserved role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  name: 'superuser',
                  metadata: { _reserved: true },
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('reservedRoleBadge')).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
        'Reserved roles are built-in and cannot be removed or modified.'
      );
      expect(screen.getByTestId('simplePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectReadOnlyFormButtons();
    });

    it('can render a user defined role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.queryByTestId('reservedRoleBadge')).not.toBeInTheDocument();
      expect(screen.getByTestId('simplePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('can render a user defined role with description', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  description: 'my custom role description',
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      const descInput = screen.getByTestId('roleFormDescriptionInput') as HTMLInputElement;
      expect(descInput.value).toBe('my custom role description');
      expect(descInput.disabled).toBe(false);
      expectSaveFormButtons();
    });

    it('can render a reserved role with description', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  description: 'my reserved role description',
                  name: 'my custom role',
                  metadata: {
                    _reserved: true,
                  },
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      const descInput = screen.getByTestId('roleFormDescriptionInput') as HTMLInputElement;
      expect(descInput.closest('.euiToolTipAnchor')).not.toBeNull();
      expect(descInput.value).toBe('my reserved role description');
      expect(descInput.disabled).toBe(true);
    });

    it('can render when creating a new role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...getProps({ action: 'edit', spacesEnabled: false })} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('simplePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(false);
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.getByTestId('indexPrivileges-remote_indices')).toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('redirects back to roles when creating a new role without privileges', async () => {
      coreStart.application.capabilities = {
        ...coreStart.application.capabilities,
        roles: {
          save: false,
        },
      };

      const props = getProps({ action: 'edit', spacesEnabled: false });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(props.history.push).toHaveBeenCalledWith('/');
    });

    it('can render when cloning an existing role', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                role: {
                  name: '',
                  metadata: { _reserved: false },
                  elasticsearch: {
                    cluster: ['all', 'manage'],
                    indices: [
                      {
                        names: ['foo*'],
                        privileges: ['all'],
                        field_security: { except: ['f'], grant: ['b*'] },
                      },
                    ],
                    run_as: ['elastic'],
                  },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('simplePrivilegeSectionMock')).toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(false);
      expectSaveFormButtons();
    });

    it('renders a partial read-only view when there is a transform error', async () => {
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage
              {...getProps({
                action: 'edit',
                spacesEnabled: false,
                canManageSpaces: false,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [],
                  _transform_error: [{ reason: 'kibana:reserved_privileges_mixed', state: [] }],
                },
              })}
            />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      expect(screen.getByTestId('transformErrorSectionMock')).toBeInTheDocument();
      expectReadOnlyFormButtons();
    });
  });

  it('hides remote index privileges section when not supported', async () => {
    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage {...getProps({ action: 'edit', canUseRemoteIndices: false })} />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();

    expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
    expect(screen.queryByTestId('indexPrivileges-remote_indices')).not.toBeInTheDocument();
  });

  it('registers fatal error if features endpoint fails unexpectedly', async () => {
    const error = { response: { status: 500 } };
    const getFeatures = jest.fn().mockRejectedValue(error);
    const props = getProps({ action: 'edit' });
    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage {...props} getFeatures={getFeatures} />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();
    expect(props.fatalErrors.add).toHaveBeenLastCalledWith(error);
    expect(screen.queryByTestId('spaceAwarePrivilegeSectionMock')).not.toBeInTheDocument();
  });

  it('can render if features call is not allowed', async () => {
    const error = { response: { status: 403 } };
    const getFeatures = jest.fn().mockRejectedValue(error);
    const props = getProps({ action: 'edit' });
    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage {...props} getFeatures={getFeatures} />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();
    expect(props.fatalErrors.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
    expectSaveFormButtons();
  });

  it('can render if index patterns are not available', async () => {
    const dataViews = dataViewPluginMocks.createStartContract();
    dataViews.getTitles = jest.fn().mockRejectedValue({ response: { status: 403 } });

    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage {...{ ...getProps({ action: 'edit' }), dataViews }} />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();

    expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
    expectSaveFormButtons();
  });

  it('can render for serverless buildFlavor', async () => {
    const dataViews = dataViewPluginMocks.createStartContract();
    dataViews.getTitles = jest.fn().mockRejectedValue({ response: { status: 403 } });

    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage
            {...{
              ...getProps({
                action: 'edit',
                spacesEnabled: true,
                role: {
                  name: 'my custom role',
                  metadata: {},
                  elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                  kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
                },
                buildFlavor: 'serverless',
              }),
              dataViews,
            }}
          />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();

    expect(screen.queryByTestId('reservedRoleBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Set privileges on your Elasticsearch data and control access to your Project spaces.'
    );
    expect(screen.getByTestId('spaceAwarePrivilegeSectionMock')).toBeInTheDocument();
    expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
    expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(true);
    expect(MockedElasticsearchPrivileges).toHaveBeenCalledWith(
      expect.objectContaining({ buildFlavor: 'serverless' })
    );
    expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
    expect(screen.queryByTestId('indexPrivileges-remote_indices')).not.toBeInTheDocument();
    expectSaveFormButtons();
  });

  it('render role with wildcard base privilege without edit/delete actions', async () => {
    render(
      <TestProviders>
        <KibanaContextProvider services={coreStart}>
          <EditRolePage
            {...getProps({
              action: 'edit',
              role: {
                name: 'my custom role',
                metadata: {},
                elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
                kibana: [{ spaces: ['*'], base: ['*'], feature: {} }],
              },
            })}
          />
        </KibanaContextProvider>
      </TestProviders>
    );

    await waitForRender();

    expect(screen.queryByTestId('privilegeEditAction-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('privilegeDeleteAction-0')).not.toBeInTheDocument();
    expectReadOnlyFormButtons();
  });

  describe('in create mode', () => {
    it('renders an error for existing role name', async () => {
      const props = getProps({ action: 'edit' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      const nameInput = screen.getByTestId('roleFormNameInput');
      fireEvent.change(nameInput, { target: { value: 'system_indices_superuser' } });
      fireEvent.blur(nameInput);

      await waitForRender();

      const formRow = screen.getByTestId('roleNameFormRow');
      expect(
        within(formRow).getByText('A role with this name already exists.')
      ).toBeInTheDocument();
      expectSaveFormButtons();
      expect(screen.getByTestId('roleFormSaveButton')).toBeDisabled();
    });

    it('renders an error on save of existing role name', async () => {
      const props = getProps({ action: 'edit' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      props.rolesAPIClient.saveRole.mockRejectedValue({
        body: {
          statusCode: 409,
          message: 'Role already exists and cannot be created: system_indices_superuser',
        },
      });

      await waitForRender();

      const nameInput = screen.getByTestId('roleFormNameInput');
      const saveButton = screen.getByTestId('roleFormSaveButton');

      fireEvent.change(nameInput, { target: { value: 'system_indices_superuser' } });
      fireEvent.click(saveButton);

      await waitForRender();

      const formRow = screen.getByTestId('roleNameFormRow');
      expect(
        within(formRow).getByText('A role with this name already exists.')
      ).toBeInTheDocument();
      expect(props.notifications.toasts.addDanger).toHaveBeenCalledTimes(0);
      expectSaveFormButtons();
      expect(screen.getByTestId('roleFormSaveButton')).toBeDisabled();
    });

    it('does not render an error for new role name', async () => {
      const props = getProps({ action: 'edit' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      props.rolesAPIClient.getRole.mockRejectedValue(new Error('not found'));

      await waitForRender();

      const nameInput = screen.getByTestId('roleFormNameInput');
      fireEvent.change(nameInput, { target: { value: 'system_indices_superuser' } });
      fireEvent.blur(nameInput);

      await waitForRender();

      const formRow = screen.getByTestId('roleNameFormRow');
      expect(
        within(formRow).queryByText('A role with this name already exists.')
      ).not.toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('can render for serverless buildFlavor', async () => {
      const props = getProps({ action: 'edit', buildFlavor: 'serverless' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      props.rolesAPIClient.getRole.mockRejectedValue(new Error('not found'));

      await waitForRender();

      const nameInput = screen.getByTestId('roleFormNameInput');
      fireEvent.change(nameInput, { target: { value: 'system_indices_superuser' } });
      fireEvent.blur(nameInput);

      await waitForRender();

      const formRow = screen.getByTestId('roleNameFormRow');
      expect(
        within(formRow).queryByText('A role with this name already exists.')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('reservedRoleBadge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('userCannotManageSpacesCallout')).not.toBeInTheDocument();
      expect((screen.getByTestId('roleFormNameInput') as HTMLInputElement).disabled).toBe(false);
      expect(MockedElasticsearchPrivileges).toHaveBeenCalledWith(
        expect.objectContaining({ buildFlavor: 'serverless' })
      );
      expect(screen.getByTestId('indexPrivileges-indices')).toBeInTheDocument();
      expect(screen.queryByTestId('indexPrivileges-remote_indices')).not.toBeInTheDocument();
      expectSaveFormButtons();
    });

    it('does not render a notification on save of new role name', async () => {
      const props = getProps({ action: 'edit' });
      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      props.rolesAPIClient.getRole.mockRejectedValue(new Error('not found'));

      await waitForRender();

      const nameInput = screen.getByTestId('roleFormNameInput');
      const saveButton = screen.getByTestId('roleFormSaveButton');

      fireEvent.change(nameInput, { target: { value: 'system_indices_superuser' } });
      fireEvent.click(saveButton);

      await waitForRender();

      const formRow = screen.getByTestId('roleNameFormRow');
      expect(
        within(formRow).queryByText('A role with this name already exists.')
      ).not.toBeInTheDocument();
      expect(props.notifications.toasts.addDanger).toHaveBeenCalledTimes(0);
      expectSaveFormButtons();
    });
  });

  describe('unsaved changes', () => {
    const role: Role = {
      name: 'my custom role',
      description: 'a role',
      metadata: {},
      elasticsearch: { cluster: ['all'], indices: [], run_as: ['*'] },
      kibana: [{ spaces: ['*'], base: ['all'], feature: {} }],
    };

    // A real ScopedHistory, rather than `scopedHistoryMock`: the prompt works by installing a
    // `history.block` handler, which the mock does not implement.
    const renderEditRolePage = async ({ existingRole = true } = {}) => {
      const history = new CoreScopedHistory(
        createMemoryHistory({
          initialEntries: [existingRole ? '/mock/edit/my_role' : '/mock/edit'],
        }),
        '/mock'
      );
      const props = {
        ...getProps({ action: 'edit', role: existingRole ? role : undefined }),
        history,
      };
      props.overlays.openConfirm.mockResolvedValue(false);

      render(
        <TestProviders>
          <KibanaContextProvider services={coreStart}>
            <EditRolePage {...props} />
          </KibanaContextProvider>
        </TestProviders>
      );

      await waitForRender();

      return {
        history,
        openConfirm: props.overlays.openConfirm,
        navigateToUrl: props.navigateToUrl,
        rolesAPIClient: props.rolesAPIClient,
      };
    };

    const editDescription = (value: string) =>
      fireEvent.change(screen.getByTestId('roleFormDescriptionInput'), { target: { value } });

    it('does not prompt when leaving an untouched role', async () => {
      const { history, openConfirm } = await renderEditRolePage();

      history.push('/');

      expect(openConfirm).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/');
    });

    it('does not prompt when leaving an untouched create form', async () => {
      // the create form pre-populates an empty index privilege, which is not a user change
      const { history, openConfirm } = await renderEditRolePage({ existingRole: false });

      history.push('/');

      expect(openConfirm).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/');
    });

    it('prompts when leaving a create form with unsaved changes', async () => {
      const { history, openConfirm } = await renderEditRolePage({ existingRole: false });

      fireEvent.change(screen.getByTestId('roleFormNameInput'), {
        target: { value: 'my_new_role' },
      });
      history.push('/');

      await waitFor(() => {
        expect(openConfirm).toHaveBeenCalled();
      });
      expect(history.location.pathname).toBe('/edit');
    });

    it('prompts when leaving a role with unsaved changes', async () => {
      const { history, openConfirm } = await renderEditRolePage();

      editDescription('a different role');
      history.push('/');

      await waitFor(() => {
        expect(openConfirm).toHaveBeenCalled();
      });
      // navigation stays blocked until the user confirms
      expect(history.location.pathname).toBe('/edit/my_role');
    });

    it('does not prompt when the change has been reverted', async () => {
      const { history, openConfirm } = await renderEditRolePage();

      editDescription('a different role');
      editDescription('a role');
      history.push('/');

      expect(openConfirm).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/');
    });

    it('does not prompt after the role has been saved', async () => {
      const { history, openConfirm } = await renderEditRolePage();

      editDescription('a different role');
      fireEvent.click(screen.getByTestId('roleFormSaveButton'));

      await waitFor(() => {
        expect(history.location.pathname).toBe('/');
      });
      expect(openConfirm).not.toHaveBeenCalled();
    });

    it('prompts again when saving the role failed', async () => {
      const { history, openConfirm, rolesAPIClient } = await renderEditRolePage();
      rolesAPIClient.saveRole.mockRejectedValue(new Error('could not save'));

      editDescription('a different role');
      fireEvent.click(screen.getByTestId('roleFormSaveButton'));
      await waitForRender();

      // the role was never saved, so those changes are still worth warning about
      history.push('/');

      await waitFor(() => {
        expect(openConfirm).toHaveBeenCalled();
      });
      expect(history.location.pathname).toBe('/edit/my_role');
    });

    it('does not prompt when the form is cancelled', async () => {
      const { history, openConfirm } = await renderEditRolePage();

      editDescription('a different role');
      fireEvent.click(screen.getByTestId('roleFormCancelButton'));

      await waitFor(() => {
        expect(history.location.pathname).toBe('/');
      });
      expect(openConfirm).not.toHaveBeenCalled();
    });

    it('navigates away when the user confirms the prompt', async () => {
      const { history, openConfirm, navigateToUrl } = await renderEditRolePage();
      openConfirm.mockResolvedValue(true);

      editDescription('a different role');
      history.push('/');

      // on confirm the prompt unblocks and navigates itself, to the base-path-prepended target
      await waitFor(() => {
        expect(navigateToUrl).toHaveBeenCalledWith('/mock/', expect.anything());
      });
    });
  });
});

async function waitForRender() {
  await waitFor(() => {});
}
