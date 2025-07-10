/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCheckboxProps } from '@elastic/eui';
import { waitFor } from '@testing-library/react';
import type { ReactWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { notificationServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { KibanaFeature } from '@kbn/features-plugin/public';
import { featuresPluginMock } from '@kbn/features-plugin/public/mocks';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { CreateSpacePage } from './create_space_page';
import type { SolutionView, Space } from '../../../common/types/latest';
import { EventTracker } from '../../analytics';
import type { SpacesManager } from '../../spaces_manager';
import { spacesManagerMock } from '../../spaces_manager/mocks';
import { EnabledFeatures } from '../components/enabled_features';

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

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    const nameInput = wrapper.find('input[name="name"]');
    const descriptionInput = wrapper.find('textarea[name="description"]');

    nameInput.simulate('change', { target: { value: 'New Space Name' } });
    descriptionInput.simulate('change', { target: { value: 'some description' } });

    updateSpace(wrapper, false, 'oblt');

    const createButton = wrapper.find('button[data-test-subj="save-space-button"]');
    createButton.simulate('click');
    await Promise.resolve();

    expect(spacesManager.createSpace).toHaveBeenCalledWith({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      initials: 'NS',
      color: '#EAAE01',
      imageUrl: '',
      disabledFeatures: [],
      solution: 'oblt',
    });
  });

  it('validates the form (name, initials, solution view...)', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    const createButton = wrapper.find('button[data-test-subj="save-space-button"]');
    createButton.simulate('click');
    await Promise.resolve();

    {
      const errors = wrapper.find('div.euiFormErrorText').map((node) => node.text());
      expect(errors).toEqual([
        'Enter a name.',
        'Enter a URL identifier.',
        'Select a solution.',
        'Enter initials.',
      ]);

      expect(spacesManager.createSpace).not.toHaveBeenCalled();

      const nameInput = wrapper.find('input[name="name"]');
      nameInput.simulate('change', { target: { value: 'New Space Name' } });
    }

    createButton.simulate('click');
    await Promise.resolve();

    {
      const errors = wrapper.find('div.euiFormErrorText').map((node) => node.text());
      expect(errors).toEqual(['Select a solution.']); // requires solution view to be set
    }

    updateSpace(wrapper, false, 'oblt');

    createButton.simulate('click');
    await Promise.resolve();

    {
      const errors = wrapper.find('div.euiFormErrorText').map((node) => node.text());
      expect(errors).toEqual([]); // no more errors
    }

    expect(spacesManager.createSpace).toHaveBeenCalled();
  });

  it('shows solution view select when visible', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    expect(findTestSubject(wrapper, 'navigationPanel')).toHaveLength(1);
  });

  it('hides solution view select when not visible', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    expect(findTestSubject(wrapper, 'navigationPanel')).toHaveLength(0);
  });

  it('shows feature visibility controls when allowed', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    // expect visible features table to exist after setting the Solution View to Classic
    await waitFor(() => {
      // switch to classic
      updateSpace(wrapper, false, 'classic');
      // expect visible features table to exist again
      expect(wrapper.find(EnabledFeatures)).toHaveLength(1);
    });
  });

  it('hides feature visibility controls when not allowed', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(wrapper.find('input[name="name"]')).toHaveLength(1);
    });

    expect(wrapper.find(EnabledFeatures)).toHaveLength(0);
  });

  it('hides feature visibility controls when solution view is not "classic"', async () => {
    const spacesManager = spacesManagerMock.create();

    const wrapper = mountWithIntl(
      <CreateSpacePage
        spacesManager={spacesManager}
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

    await waitFor(async () => {
      await Promise.resolve();

      wrapper.update();
    });

    await waitFor(() => {
      // switch to observability view
      updateSpace(wrapper, false, 'oblt');
      // expect visible features table to not exist
      expect(wrapper.find(EnabledFeatures)).toHaveLength(0);
    });

    await waitFor(() => {
      // switch to classic
      updateSpace(wrapper, false, 'classic');
      // expect visible features table to exist again
      expect(wrapper.find(EnabledFeatures)).toHaveLength(1);
    });
  });

  it('notifies when there is an error retrieving features', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);
    spacesManager.getActiveSpace = jest.fn().mockResolvedValue(space);

    const error = new Error('something awful happened');

    const notifications = notificationServiceMock.createStartContract();

    const wrapper = mountWithIntl(
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
      wrapper.update();
      expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Error loading available features',
      });
    });
  });
});

function updateSpace(
  wrapper: ReactWrapper<any, any>,
  updateFeature = true,
  solution?: SolutionView
) {
  const nameInput = wrapper.find('input[name="name"]');
  const descriptionInput = wrapper.find('textarea[name="description"]');

  nameInput.simulate('change', { target: { value: 'New Space Name' } });
  descriptionInput.simulate('change', { target: { value: 'some description' } });

  if (updateFeature) {
    toggleFeature(wrapper);
  }

  if (solution) {
    act(() => {
      findTestSubject(wrapper, `solutionViewSelect`).simulate('click');
    });
    wrapper.update();
    findTestSubject(wrapper, `solutionView${capitalizeFirstLetter(solution)}Option`).simulate(
      'click'
    );
  }
}

function toggleFeature(wrapper: ReactWrapper<any, any>) {
  const {
    onChange = () => {
      throw new Error('expected onChange to be defined');
    },
  } = wrapper.find('input#featureCategoryCheckbox_kibana').props() as EuiCheckboxProps;
  onChange({ target: { checked: false } } as any);

  wrapper.update();
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
