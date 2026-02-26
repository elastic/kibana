/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';

import { CreateSpacePage } from './create_space_page';
import type { SolutionView, Space } from '../../../common/types/latest';
import { EventTracker } from '../../analytics';
import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';

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

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('ManageSpacePage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });
  });

  const history = scopedHistoryMock.create();

  it('allows a space to be created', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('addSpaceName'), {
      target: { value: 'New Space Name' },
    });
    fireEvent.change(screen.getByTestId('descriptionSpaceText'), {
      target: { value: 'some description' },
    });

    await updateSolutionView('oblt');

    await userEvent.click(screen.getByTestId('save-space-button'));
    await waitFor(() => {
      expect(spacesManager.createSpace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Space Name',
          description: 'some description',
          solution: 'oblt',
        })
      );
    });
  });

  it('validates the form (name, initials, solution view...)', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('save-space-button'));

    await waitFor(() => {
      expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    });

    expect(spacesManager.createSpace).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('addSpaceName'), {
      target: { value: 'New Space Name' },
    });

    await userEvent.click(screen.getByTestId('save-space-button'));
    await waitFor(() => {
      expect(screen.getByText('Select a solution.')).toBeInTheDocument();
    });

    await updateSolutionView('oblt');

    await userEvent.click(screen.getByTestId('save-space-button'));
    await waitFor(() => {
      expect(spacesManager.createSpace).toHaveBeenCalled();
    });
  });

  it('shows solution view select when visible', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.getByTestId('navigationPanel')).toBeInTheDocument();
  });

  it('hides solution view select when not visible', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('navigationPanel')).not.toBeInTheDocument();
  });

  it('shows feature visibility controls when allowed', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    await updateSolutionView('classic');

    await waitFor(() => {
      expect(screen.getByTestId('enabled-features-panel')).toBeInTheDocument();
    });
  });

  it('hides feature visibility controls when not allowed', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    renderWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager as unknown as SpacesManager}
        getFeatures={featuresStart.getFeatures}
        notifications={notificationServiceMock.createStartContract()}
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

    await waitFor(() => {
      expect(screen.getByTestId('addSpaceName')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('enabled-features-panel')).not.toBeInTheDocument();
  });

  it('notifies when there is an error retrieving features', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const error = new Error('something awful happened');
    const notifications = notificationServiceMock.createStartContract();

    renderWithIntl(
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
});

async function updateSolutionView(solution: SolutionView) {
  await userEvent.click(screen.getByTestId('solutionViewSelect'));
  await userEvent.click(
    screen.getByTestId(`solutionView${solution.charAt(0).toUpperCase() + solution.slice(1)}Option`)
  );
}
