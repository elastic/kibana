/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import React from 'react';

import { CoreScopedHistory } from '@kbn/core/public';
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
import { asSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { EditSpaceSettingsTab } from './edit_space_general_tab';
import { EditSpaceProviderRoot } from './provider/edit_space_provider';
import type { SolutionView } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getPrivilegeAPIClientMock } from '../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';
import { getSecurityLicenseMock } from '../security_license.mock';

const space = { id: asSpaceId('default'), name: 'Default', disabledFeatures: [], _reserved: true };
const history = scopedHistoryMock.create();
const getUrlForApp = (appId: string) => appId;
const navigateToUrl = jest.fn();
const spacesManager = spacesManagerMock.create();
const getRolesAPIClient = getRolesAPIClientMock;
const getPrivilegeAPIClient = getPrivilegeAPIClientMock;
const reloadWindow = jest.fn();

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const overlays = overlayServiceMock.createStartContract();
const userProfile = userProfileServiceMock.createStart();
const theme = themeServiceMock.createStartContract();
const i18n = i18nServiceMock.createStartContract();
const logger = loggingSystemMock.createLogger();

const navigateSpy = jest.spyOn(history, 'push').mockImplementation(() => {});
const updateSpaceSpy = jest
  .spyOn(spacesManager, 'updateSpace')
  .mockImplementation(() => Promise.resolve());
const deleteSpaceSpy = jest
  .spyOn(spacesManager, 'deleteSpace')
  .mockImplementation(() => Promise.resolve());

describe('EditSpaceSettings', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    updateSpaceSpy.mockReset();
    deleteSpaceSpy.mockReset();
  });

  const TestComponent: React.FC<React.PropsWithChildren> = ({ children }) => {
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
          getIsRoleManagementEnabled={() => Promise.resolve(() => undefined)}
          getPrivilegesAPIClient={getPrivilegeAPIClient}
          getSecurityLicense={getSecurityLicenseMock}
          userProfile={userProfile}
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

  it('should render controls for initial state of editing a space', () => {
    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionSpaceText')).toBeInTheDocument();
    expect(screen.getByTestId('spaceLetterInitial')).toBeInTheDocument();
    expect(screen.getByTestId('euiColorPickerAnchor')).toBeInTheDocument();

    expect(screen.queryByTestId('solutionViewSelect')).not.toBeInTheDocument(); // hides solution view when not not set to visible
    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument(); // hides navigation features table when not set to visible
  });

  it('shows solution view select when visible', async () => {
    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('solutionViewSelect')).toBeInTheDocument();
    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument(); // hides navigation features table when not set to visible
  });

  it('shows feature visibility controls when allowed', async () => {
    const features = [
      new KibanaFeature({
        id: asSpaceId('feature-1'),
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={space}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    expect(screen.getByTestId('enabled-features-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('solutionViewSelect')).not.toBeInTheDocument(); // hides solution view when not not set to visible
  });

  it('allows a space to be updated', async () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: 'es' as SolutionView,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space name
    const nameInput = screen.getByTestId('addSpaceName');
    fireEvent.change(nameInput, { target: { value: 'Updated Name Of Space' } });

    expect(screen.queryByTestId('space-edit-page-user-impact-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = await screen.findByTestId('save-space-button'); // appears via re-render
    await userEvent.click(updateButton);

    expect(updateSpaceSpy).toHaveBeenCalledWith({
      ...spaceToUpdate,
      name: 'Updated Name Of Space',
      initials: 'UN',
      imageUrl: '',
      color: '#FFC7DB',
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('specifies a color when updating a space without a color or imageUrl', async () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      initials: 'AB',
      disabledFeatures: [],
      solution: 'es' as SolutionView,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space name
    const nameInput = screen.getByTestId('addSpaceName');
    fireEvent.change(nameInput, { target: { value: 'Updated Name Of Space' } });

    expect(screen.queryByTestId('space-edit-page-user-impact-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = await screen.findByTestId('save-space-button'); // appears via re-render
    await userEvent.click(updateButton);

    expect(updateSpaceSpy).toHaveBeenCalledWith({
      ...spaceToUpdate,
      name: 'Updated Name Of Space',
      initials: 'UN',
      imageUrl: '',
      color: '#FFC7DB',
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('allows space to be deleted', async () => {
    const spaceToDelete = {
      id: asSpaceId('delete-me-space'),
      name: 'Delete Me Space',
      description: 'This is a very nice space... for me to DELETE!',
      color: '#aabbcc',
      initials: 'XX',
      disabledFeatures: [],
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToDelete}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    const deleteButton = screen.getByTestId('delete-space-button');
    await userEvent.click(deleteButton);

    const confirmButton = await screen.findByTestId('confirmModalConfirmButton'); // click delete confirm
    await userEvent.click(confirmButton);

    expect(deleteSpaceSpy).toHaveBeenCalledWith(spaceToDelete);
  });

  it('sets calculated fields for existing spaces', async () => {
    // The Spaces plugin provides functions to calculate the initials and color of a space if they have not been customized. The new space
    // management page explicitly sets these fields when a new space is created, but it should also handle existing "legacy" spaces that do
    // not already have these fields set.
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: undefined,
      initials: undefined,
      imageUrl: undefined,
      disabledFeatures: [],
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space name
    const nameInput = screen.getByTestId('addSpaceName');
    fireEvent.change(nameInput, { target: { value: 'Updated Existing Space' } });

    const updateButton = await screen.findByTestId('save-space-button'); // appears via re-render
    await userEvent.click(updateButton);

    expect(updateSpaceSpy).toHaveBeenCalledWith({
      ...spaceToUpdate,
      name: 'Updated Existing Space',
      color: '#FFC7DB',
      initials: 'UE',
      imageUrl: '',
    });
  });

  it('warns when updating solution view', async () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: undefined,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space solution view
    const solutionViewPicker = screen.getByTestId('solutionViewSelect');
    await userEvent.click(solutionViewPicker);

    const esSolutionOption = await screen.findByTestId('solutionViewEsOption'); // appears via re-render
    await userEvent.click(esSolutionOption);

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = screen.getByTestId('save-space-button');
    await userEvent.click(updateButton);

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        imageUrl: '',
        solution: 'es',
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates away when cancel is clicked after changing the solution view', async () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: undefined,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space solution view
    const solutionViewPicker = screen.getByTestId('solutionViewSelect');
    await userEvent.click(solutionViewPicker);

    const esSolutionOption = await screen.findByTestId('solutionViewEsOption');
    await userEvent.click(esSolutionOption);

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();

    // click cancel - should navigate back to spaces list without saving
    const cancelButton = screen.getByTestId('cancel-space-button');
    await userEvent.click(cancelButton);

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('warns when updating features in the active space', async () => {
    const features = [
      new KibanaFeature({
        id: asSpaceId('feature-1'),
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: SOLUTION_VIEW_CLASSIC,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space visible features
    const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
    expect(feature1Checkbox).toBeChecked();

    await userEvent.click(feature1Checkbox);
    await waitFor(() => {
      expect(feature1Checkbox).not.toBeChecked();
    });

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = screen.getByTestId('save-space-button');
    await userEvent.click(updateButton);

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        imageUrl: '',
        disabledFeatures: ['feature-1'],
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('no longer considers the form dirty once a change has been reverted', async () => {
    const features = [
      new KibanaFeature({
        id: 'feature-1',
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: SOLUTION_VIEW_CLASSIC,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // the "Apply changes" button is only rendered while the form has unsaved changes
    expect(screen.queryByTestId('save-space-button')).not.toBeInTheDocument();

    const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
    await userEvent.click(feature1Checkbox);

    expect(await screen.findByTestId('save-space-button')).toBeInTheDocument();

    await userEvent.click(feature1Checkbox);

    await waitFor(() => {
      expect(screen.queryByTestId('save-space-button')).not.toBeInTheDocument();
    });
  });

  describe('unsaved changes prompt', () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: SOLUTION_VIEW_CLASSIC,
    };

    // A real ScopedHistory, rather than `scopedHistoryMock`: the prompt works by installing a
    // `history.block` handler, which the mock does not implement, so a mocked history cannot tell
    // whether the user would have been asked to confirm.
    let realHistory: CoreScopedHistory;

    const renderDirtyTab = async () => {
      realHistory = new CoreScopedHistory(
        createMemoryHistory({ initialEntries: ['/mock/edit/existing-space'] }),
        '/mock'
      );
      overlays.openConfirm.mockClear();

      render(
        <TestComponent>
          <EditSpaceSettingsTab
            space={spaceToUpdate}
            history={realHistory}
            features={[]}
            allowFeatureVisibility={false}
            allowSolutionVisibility={true}
            reloadWindow={reloadWindow}
          />
        </TestComponent>
      );

      fireEvent.change(screen.getByTestId('descriptionSpaceText'), {
        target: { value: 'a new description' },
      });
      expect(await screen.findByTestId('save-space-button')).toBeInTheDocument();
    };

    it('prompts when navigating away with unsaved changes', async () => {
      await renderDirtyTab();

      realHistory.push('/');

      await waitFor(() => {
        expect(overlays.openConfirm).toHaveBeenCalled();
      });
      // navigation stays blocked until the user confirms
      expect(realHistory.location.pathname).toBe('/edit/existing-space');
    });

    it('does not prompt when the form is cancelled', async () => {
      await renderDirtyTab();

      await userEvent.click(screen.getByTestId('cancel-space-button'));

      await waitFor(() => {
        expect(realHistory.location.pathname).toBe('/');
      });
      expect(overlays.openConfirm).not.toHaveBeenCalled();
    });

    it('does not prompt when the changes are saved', async () => {
      await renderDirtyTab();

      await userEvent.click(screen.getByTestId('save-space-button'));

      await waitFor(() => {
        expect(realHistory.location.pathname).toBe('/');
      });
      expect(overlays.openConfirm).not.toHaveBeenCalled();
    });
  });

  it('submits the disabled features list when the solution view is undefined', async () => {
    const features = [
      new KibanaFeature({
        id: asSpaceId('feature-1'),
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: undefined,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // update the space visible features
    const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
    expect(feature1Checkbox).toBeChecked();
    await userEvent.click(feature1Checkbox);
    await waitFor(() => {
      expect(feature1Checkbox).not.toBeChecked();
    });

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = screen.getByTestId('save-space-button');
    await userEvent.click(updateButton);

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        imageUrl: '',
        disabledFeatures: ['feature-1'],
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('empties the disabled features list when the solution view non-classic', async () => {
    const features = [
      new KibanaFeature({
        id: asSpaceId('feature-1'),
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      solution: SOLUTION_VIEW_CLASSIC,
    };

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={features}
          allowFeatureVisibility={true}
          allowSolutionVisibility={true}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    // customize the space visible features to disable feature-1
    const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
    expect(feature1Checkbox).toBeChecked();

    await userEvent.click(feature1Checkbox);
    await waitFor(() => {
      expect(feature1Checkbox).not.toBeChecked();
    });

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    // change the selected solution view to es
    const solutionViewPicker = screen.getByTestId('solutionViewSelect');
    await userEvent.click(solutionViewPicker);

    const esSolutionOption = await screen.findByTestId('solutionViewEsOption'); // appears via re-render
    await userEvent.click(esSolutionOption);

    // perform the save
    const updateButton = screen.getByTestId('save-space-button');
    await userEvent.click(updateButton);

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(updateSpaceSpy).toHaveBeenCalledWith({
        ...spaceToUpdate,
        imageUrl: '',
        solution: 'es',
        disabledFeatures: [], // "feature-1" became deselected
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('hides CustomizeCps component when project_routing capability is not present', async () => {
    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={space}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  const renderWithCapability = (
    capability: { read_space_default?: boolean; manage_space_default?: boolean },
    {
      isTierEligible = false,
      spaceForRender = space,
      omitCps = false,
    }: {
      isTierEligible?: boolean;
      spaceForRender?: {
        id: SpaceId;
        name: string;
        disabledFeatures: string[];
        projectRouting?: string;
      };
      /** When true, leave `cps` out of Kibana context (plugin not present). */
      omitCps?: boolean;
    } = {}
  ) => {
    const capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: { manage: true },
      project_routing: capability,
    };

    const TestComponentWithCapability: React.FC<React.PropsWithChildren> = ({ children }) => {
      return (
        <IntlProvider locale="en">
          <KibanaContextProvider
            services={{
              application: { capabilities },
              ...(omitCps ? {} : { cps: { isTierEligible } }),
            }}
          >
            <EditSpaceProviderRoot
              capabilities={capabilities}
              getUrlForApp={getUrlForApp}
              navigateToUrl={navigateToUrl}
              serverBasePath=""
              spacesManager={spacesManager}
              getRolesAPIClient={getRolesAPIClient}
              http={http}
              notifications={notifications}
              overlays={overlays}
              getIsRoleManagementEnabled={() => Promise.resolve(() => undefined)}
              getPrivilegesAPIClient={getPrivilegeAPIClient}
              getSecurityLicense={getSecurityLicenseMock}
              userProfile={userProfile}
              theme={theme}
              i18n={i18n}
              logger={logger}
              enableSecurityLink=""
            >
              {children}
            </EditSpaceProviderRoot>
          </KibanaContextProvider>
        </IntlProvider>
      );
    };

    return render(
      <TestComponentWithCapability>
        <EditSpaceSettingsTab
          space={spaceForRender}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponentWithCapability>
    );
  };

  it('shows CustomizeCps component when project_routing.read_space_default capability is true and project is on a CPS-eligible tier', async () => {
    renderWithCapability(
      { read_space_default: true, manage_space_default: true },
      { isTierEligible: true }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
    });
  });

  it('hides CustomizeCps component when project_routing.read_space_default capability is true but tier is not eligible and space has default routing', async () => {
    renderWithCapability(
      { read_space_default: true, manage_space_default: true },
      { isTierEligible: false }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('shows CustomizeCps component when tier is not eligible but the space already has a non-default project routing value', async () => {
    renderWithCapability(
      { read_space_default: true, manage_space_default: true },
      {
        isTierEligible: false,
        spaceForRender: { ...space, projectRouting: '_alias:_origin' },
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
    });
  });

  it('shows CustomizeCps component when the CPS plugin is absent from context but the space has non-default project routing', async () => {
    // Defensive: cps?.isTierEligible is undefined when the plugin is not in
    // Kibana context; custom routing alone should still surface the section.
    renderWithCapability(
      { read_space_default: true, manage_space_default: true },
      {
        omitCps: true,
        spaceForRender: { ...space, projectRouting: '_alias:_origin' },
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
    });
  });

  it('hides CustomizeCps component when tier is not eligible and the space has the default project routing value (_alias:*)', async () => {
    renderWithCapability(
      { read_space_default: true, manage_space_default: true },
      {
        isTierEligible: false,
        spaceForRender: { ...space, projectRouting: '_alias:*' },
      }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('hides CustomizeCps component when project_routing.read_space_default capability is false even if tier is eligible', async () => {
    renderWithCapability(
      { read_space_default: false, manage_space_default: true },
      { isTierEligible: true }
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('includes projectRouting in updateSpace request when space has projectRouting', async () => {
    const spaceToUpdate = {
      id: asSpaceId('existing-space'),
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
      projectRouting: '_alias:_origin',
    };

    // Mock getActiveSpace to return the space being edited
    const getActiveSpaceSpy = jest
      .spyOn(spacesManager, 'getActiveSpace')
      .mockResolvedValue(spaceToUpdate);

    render(
      <TestComponent>
        <EditSpaceSettingsTab
          space={spaceToUpdate}
          history={history}
          features={[]}
          allowFeatureVisibility={false}
          allowSolutionVisibility={false}
          reloadWindow={reloadWindow}
        />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    // Update the space name to make the form dirty
    const nameInput = screen.getByTestId('addSpaceName');
    fireEvent.change(nameInput, { target: { value: 'Updated Space Name' } });

    // Click save
    const updateButton = await screen.findByTestId('save-space-button');
    await userEvent.click(updateButton);

    // Verify updateSpace was called with projectRouting included
    await waitFor(() => {
      expect(updateSpaceSpy).toHaveBeenCalled();
      const callArgs = updateSpaceSpy.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        id: asSpaceId('existing-space'),
        name: 'Updated Space Name',
        projectRouting: '_alias:_origin',
      });
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);

    // Clean up
    getActiveSpaceSpy.mockRestore();
  });
});
