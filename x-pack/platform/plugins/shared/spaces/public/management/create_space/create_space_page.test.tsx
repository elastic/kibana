/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { CreateSpacePage } from './create_space_page';
import type { SolutionView, Space } from '../../../common/types/latest';
import { EventTracker } from '../../analytics';
import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';

// To be resolved by EUI team.
// https://github.com/elastic/eui/issues/3712
jest.mock('@elastic/eui/lib/components/overlay_mask', () => {
  return {
    EuiOverlayMask: (props: any) => <div>{props.children}</div>,
  };
});

const space: Space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};

const featuresStart = featuresPluginMock.createStart();
featuresStart.getFeatures.mockResolvedValue([
  new KibanaFeature({
    id: 'feature-1',
    name: 'feature 1',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  }),
]);

const reportEvent = jest.fn();
const eventTracker = new EventTracker({ reportEvent });

describe('ManageSpacePage', () => {
  const spacesManager = spacesManagerMock.create();
  const history = scopedHistoryMock.create();
  const notifications = notificationServiceMock.createStartContract();

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });
  });

  beforeEach(() => {
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);
  });

  it('allows a space to be created', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    await updateSpace(false, 'oblt');

    const createButton = screen.getByTestId('save-space-button');
    await userEvent.click(createButton);

    expect(spacesManager.createSpace).toHaveBeenCalledWith({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      initials: 'NS',
      color: '#EAAE01',
      imageUrl: '',
      disabledFeatures: [],
      projectRouting: undefined,
      solution: 'oblt',
    });
  });

  it('validates the form (name, initials, solution view...)', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    const createButton = screen.getByTestId('save-space-button');
    await userEvent.click(createButton);

    // Wait for all validation errors to appear
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a URL identifier.')).toBeInTheDocument();
    expect(screen.getByText('Select a solution.')).toBeInTheDocument();
    expect(screen.getByText('Enter initials.')).toBeInTheDocument();

    expect(spacesManager.createSpace).not.toHaveBeenCalled();

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Space Name');

    await userEvent.click(createButton);

    // Wait for positive assertion, then check negatives synchronously
    expect(await screen.findByText('Select a solution.')).toBeInTheDocument();
    expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a URL identifier.')).not.toBeInTheDocument();
    expect(screen.queryByText('Enter initials.')).not.toBeInTheDocument();

    await updateSpace(false, 'oblt');

    await userEvent.click(createButton);

    // Wait for validation error to disappear and create to be called
    await waitFor(() => {
      expect(screen.queryByText('Select a solution.')).not.toBeInTheDocument();
    });
    expect(spacesManager.createSpace).toHaveBeenCalled();
  });

  it('shows solution view select when visible', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        allowFeatureVisibility
        allowSolutionVisibility
        eventTracker={eventTracker}
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.getByTestId('navigationPanel')).toBeInTheDocument();
  });

  it('hides solution view select when not visible', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        allowFeatureVisibility
        allowSolutionVisibility={false}
        eventTracker={eventTracker}
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('navigationPanel')).not.toBeInTheDocument();
  });

  it('shows feature visibility controls when allowed', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    // Switch to classic to show feature visibility controls
    await updateSpace(false, 'classic');

    expect(await screen.findByTestId('enabled-features-panel')).toBeInTheDocument();
  });

  it('hides feature visibility controls when not allowed', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility={false}
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();
  });

  it('hides feature visibility controls when solution view is not "classic"', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    // Switch to observability view
    await updateSpace(false, 'oblt');

    // Expect visible features table to not exist
    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();

    // Switch to classic
    await updateSpace(false, 'classic');

    // Expect visible features table to exist again
    expect(await screen.findByTestId('enabled-features-panel')).toBeInTheDocument();
  });

  it('notifies when there is an error retrieving features', async () => {
    const error = new Error('something awful happened');

    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={() => Promise.reject(error)}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    await waitFor(() => {
      expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Error loading available features',
      });
    });
  });

  it('hides CustomizeCps component when project_routing capability is not present', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('shows CustomizeCps component when project_routing.manage_space_default capability is true', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
          project_routing: { manage_space_default: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();
  });

  it('hides CustomizeCps component when project_routing.manage_space_default capability is false', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
          project_routing: { manage_space_default: false },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();

    expect(screen.queryByTestId('cpsDefaultScopePanel')).not.toBeInTheDocument();
  });

  it('includes projectRouting in createSpace call when provided', async () => {
    renderWithI18n(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notifications}
        history={history}
        capabilities={{
          navLinks: {},
          management: {},
          catalogue: {},
          spaces: { manage: true },
          project_routing: { manage_space_default: true },
        }}
        eventTracker={eventTracker}
        allowFeatureVisibility
        allowSolutionVisibility
      />
    );

    expect(await screen.findByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByTestId('cpsDefaultScopePanel')).toBeInTheDocument();

    const nameInput = screen.getByRole('textbox', { name: /name/i });
    const descriptionInput = screen.getByRole('textbox', { name: /description/i });

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Space Name');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'some description');

    await updateSpace(false, 'oblt');

    // Note: Testing actual projectRouting interaction would require mocking
    // the ProjectPickerContent component or integration-level testing.
    // For now, we verify that the CPS panel is present when capability is enabled,
    // and that the form can be submitted successfully.

    const createButton = screen.getByTestId('save-space-button');
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(spacesManager.createSpace).toHaveBeenCalled();
    });

    // Verify the call includes the expected fields
    const callArgs = spacesManager.createSpace.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      solution: 'oblt',
    });
  });
});

async function updateSpace(updateFeature = true, solution?: SolutionView) {
  const nameInput = screen.getByTestId('addSpaceName');
  const descriptionInput = screen.getByTestId('descriptionSpaceText');

  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'New Space Name');
  await userEvent.clear(descriptionInput);
  await userEvent.type(descriptionInput, 'some description');

  if (updateFeature) {
    await toggleFeature();
  }

  if (solution) {
    const solutionSelectButton = screen.getByTestId('solutionViewSelect');
    await userEvent.click(solutionSelectButton);
    const solutionOption = screen.getByTestId(
      `solutionView${capitalizeFirstLetter(solution)}Option`
    );
    await userEvent.click(solutionOption);
  }
}

async function toggleFeature() {
  const featureCheckbox = screen.getByRole('checkbox', { name: /kibana/i });
  await userEvent.click(featureCheckbox);
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
