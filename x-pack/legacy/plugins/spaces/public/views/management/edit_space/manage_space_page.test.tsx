/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/kfetch', () => ({
  kfetch: () => Promise.resolve([{ id: 'feature-1', name: 'feature 1' }]),
}));
import '../../../__mocks__/ui_capabilities';
import '../../../__mocks__/xpack_info';
import { EuiButton, EuiLink, EuiSwitch } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { SpacesNavState } from '../../nav_control';
import { ConfirmAlterActiveSpaceModal } from './confirm_alter_active_space_modal';
import { ManageSpacePage } from './manage_space_page';
import { SectionPanel } from './section_panel';
import { spacesManagerMock } from '../../../lib/mocks';
import { SpacesManager } from '../../../lib';

const space = {
  id: 'my-space',
  name: 'My Space',
  disabledFeatures: [],
};

describe('ManageSpacePage', () => {
  it('allows a space to be created', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.createSpace = jest.fn(spacesManager.createSpace);

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };

    const wrapper = mountWithIntl(
      <ManageSpacePage.WrappedComponent
        spacesManager={(spacesManager as unknown) as SpacesManager}
        spacesNavState={spacesNavState}
        intl={null as any}
      />
    );

    await waitForDataLoad(wrapper);

    const nameInput = wrapper.find('input[name="name"]');
    const descriptionInput = wrapper.find('textarea[name="description"]');

    nameInput.simulate('change', { target: { value: 'New Space Name' } });
    descriptionInput.simulate('change', { target: { value: 'some description' } });

    const createButton = wrapper.find('button[data-test-subj="save-space-button"]');
    createButton.simulate('click');
    await Promise.resolve();

    expect(spacesManager.createSpace).toHaveBeenCalledWith({
      id: 'new-space-name',
      name: 'New Space Name',
      description: 'some description',
      color: undefined,
      initials: undefined,
      disabledFeatures: [],
    });
  });

  it('allows a space to be updated', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpace = jest.fn().mockResolvedValue({
      id: 'existing-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
    });

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };
    const wrapper = mountWithIntl(
      <ManageSpacePage.WrappedComponent
        spaceId={'existing-space'}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        spacesNavState={spacesNavState}
        intl={null as any}
      />
    );

    await waitForDataLoad(wrapper);

    expect(spacesManager.getSpace).toHaveBeenCalledWith('existing-space');

    await Promise.resolve();

    wrapper.update();

    updateSpace(wrapper);

    await clickSaveButton(wrapper);

    expect(spacesManager.updateSpace).toHaveBeenCalledWith({
      id: 'existing-space',
      name: 'New Space Name',
      description: 'some description',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: ['feature-1'],
    });
  });

  it('warns when updating features in the active space', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpace = jest.fn().mockResolvedValue({
      id: 'my-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
    });

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };
    const wrapper = mountWithIntl(
      <ManageSpacePage.WrappedComponent
        spaceId={'my-space'}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        spacesNavState={spacesNavState}
        intl={null as any}
      />
    );

    await waitForDataLoad(wrapper);

    expect(spacesManager.getSpace).toHaveBeenCalledWith('my-space');

    await Promise.resolve();

    wrapper.update();

    updateSpace(wrapper);

    await clickSaveButton(wrapper);

    const warningDialog = wrapper.find(ConfirmAlterActiveSpaceModal);
    expect(warningDialog).toHaveLength(1);

    expect(spacesManager.updateSpace).toHaveBeenCalledTimes(0);

    const confirmButton = warningDialog
      .find(EuiButton)
      .find('[data-test-subj="confirmModalConfirmButton"]')
      .find('button');

    confirmButton.simulate('click');

    await Promise.resolve();

    wrapper.update();

    expect(spacesManager.updateSpace).toHaveBeenCalledTimes(1);
  });

  it('does not warn when features are left alone in the active space', async () => {
    const spacesManager = spacesManagerMock.create();
    spacesManager.getSpace = jest.fn().mockResolvedValue({
      id: 'my-space',
      name: 'Existing Space',
      description: 'hey an existing space',
      color: '#aabbcc',
      initials: 'AB',
      disabledFeatures: [],
    });

    const spacesNavState: SpacesNavState = {
      getActiveSpace: () => space,
      refreshSpacesList: jest.fn(),
    };
    const wrapper = mountWithIntl(
      <ManageSpacePage.WrappedComponent
        spaceId={'my-space'}
        spacesManager={(spacesManager as unknown) as SpacesManager}
        spacesNavState={spacesNavState}
        intl={null as any}
      />
    );

    await waitForDataLoad(wrapper);

    expect(spacesManager.getSpace).toHaveBeenCalledWith('my-space');

    await Promise.resolve();

    wrapper.update();

    updateSpace(wrapper, false);

    await clickSaveButton(wrapper);

    const warningDialog = wrapper.find(ConfirmAlterActiveSpaceModal);
    expect(warningDialog).toHaveLength(0);

    expect(spacesManager.updateSpace).toHaveBeenCalledTimes(1);
  });
});

function updateSpace(wrapper: ReactWrapper<any, any>, updateFeature = true) {
  const nameInput = wrapper.find('input[name="name"]');
  const descriptionInput = wrapper.find('textarea[name="description"]');

  nameInput.simulate('change', { target: { value: 'New Space Name' } });
  descriptionInput.simulate('change', { target: { value: 'some description' } });

  if (updateFeature) {
    toggleFeature(wrapper);
  }
}

function toggleFeature(wrapper: ReactWrapper<any, any>) {
  const featureSectionButton = wrapper
    .find(SectionPanel)
    .filter('[data-test-subj="enabled-features-panel"]')
    .find(EuiLink);

  featureSectionButton.simulate('click');

  wrapper.update();

  wrapper
    .find(EuiSwitch)
    .find('button')
    .simulate('click');

  wrapper.update();
}

async function clickSaveButton(wrapper: ReactWrapper<any, any>) {
  const saveButton = wrapper.find('button[data-test-subj="save-space-button"]');
  saveButton.simulate('click');

  await Promise.resolve();

  wrapper.update();
}

async function waitForDataLoad(wrapper: ReactWrapper<any, any>) {
  await Promise.resolve();
  await Promise.resolve();
  wrapper.update();
}
