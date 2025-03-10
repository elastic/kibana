/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { EditSpaceSettingsTab } from './edit_space_general_tab';
import { EditSpaceProviderRoot } from './provider/edit_space_provider';
import type { SolutionView } from '../../../common';
import { SOLUTION_VIEW_CLASSIC } from '../../../common/constants';
import { spacesManagerMock } from '../../spaces_manager/spaces_manager.mock';
import { getPrivilegeAPIClientMock } from '../privilege_api_client.mock';
import { getRolesAPIClientMock } from '../roles_api_client.mock';
import { getSecurityLicenseMock } from '../security_license.mock';

const space = { id: 'default', name: 'Default', disabledFeatures: [], _reserved: true };
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
        id: 'feature-1',
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
      id: 'existing-space',
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

    await act(async () => {
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
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('allows space to be deleted', async () => {
    const spaceToDelete = {
      id: 'delete-me-space',
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

    await act(async () => {
      const deleteButton = screen.getByTestId('delete-space-button');
      await userEvent.click(deleteButton);

      const confirmButton = await screen.findByTestId('confirmModalConfirmButton'); // click delete confirm
      await userEvent.click(confirmButton);

      expect(deleteSpaceSpy).toHaveBeenCalledWith(spaceToDelete);
    });
  });

  it('sets calculated fields for existing spaces', async () => {
    // The Spaces plugin provides functions to calculate the initials and color of a space if they have not been customized. The new space
    // management page explicitly sets these fields when a new space is created, but it should also handle existing "legacy" spaces that do
    // not already have these fields set.
    const spaceToUpdate = {
      id: 'existing-space',
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

    await act(async () => {
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
  });

  it('warns when updating solution view', async () => {
    const spaceToUpdate = {
      id: 'existing-space',
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
    await act(async () => {
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
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when updating features in the active space', async () => {
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
      id: 'existing-space',
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
    await act(async () => {
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
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it('submits the disabled features list when the solution view is undefined', async () => {
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
      id: 'existing-space',
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
    await act(async () => {
      await userEvent.click(feature1Checkbox);
    });
    await waitFor(() => {
      expect(feature1Checkbox).not.toBeChecked();
    });

    expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();

    const updateButton = screen.getByTestId('save-space-button');
    await act(async () => {
      await userEvent.click(updateButton);
    });

    expect(screen.getByTestId('confirmModalTitleText')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    await act(async () => {
      await userEvent.click(confirmButton);
    });

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
        id: 'feature-1',
        name: 'feature 1',
        app: [],
        category: DEFAULT_APP_CATEGORIES.kibana,
        privileges: null,
      }),
    ];

    const spaceToUpdate = {
      id: 'existing-space',
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
    await act(async () => {
      const feature1Checkbox = screen.getByTestId('featureCheckbox_feature-1');
      expect(feature1Checkbox).toBeChecked();

      await userEvent.click(feature1Checkbox);
      await waitFor(() => {
        expect(feature1Checkbox).not.toBeChecked();
      });

      expect(screen.getByTestId('space-edit-page-user-impact-warning')).toBeInTheDocument();
      expect(screen.queryByTestId('confirmModalTitleText')).not.toBeInTheDocument();
    });

    // change the selected solution view to es
    await act(async () => {
      const solutionViewPicker = screen.getByTestId('solutionViewSelect');
      await userEvent.click(solutionViewPicker);

      const esSolutionOption = await screen.findByTestId('solutionViewEsOption'); // appears via re-render
      await userEvent.click(esSolutionOption);
    });

    // perform the save
    await act(async () => {
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
    });

    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });
});
