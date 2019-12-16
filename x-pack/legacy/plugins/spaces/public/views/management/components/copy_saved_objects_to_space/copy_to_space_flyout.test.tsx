/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import Boom from 'boom';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { mockManagementPlugin } from '../../../../../../../../../src/legacy/core_plugins/management/public/np_ready/mocks';
import { CopySavedObjectsToSpaceFlyout } from './copy_to_space_flyout';
import { CopyToSpaceForm } from './copy_to_space_form';
import { EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import { Space } from '../../../../../common/model/space';
import { findTestSubject } from 'test_utils/find_test_subject';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { act } from '@testing-library/react';
import { ProcessingCopyToSpace } from './processing_copy_to_space';
import { spacesManagerMock } from '../../../../lib/mocks';
import { SpacesManager } from '../../../../lib';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';

jest.mock('../../../../../../../../../src/legacy/core_plugins/management/public/legacy', () => ({
  setup: mockManagementPlugin.createSetupContract(),
  start: mockManagementPlugin.createStartContract(),
}));

interface SetupOpts {
  mockSpaces?: Space[];
  returnBeforeSpacesLoad?: boolean;
}

const setup = async (opts: SetupOpts = {}) => {
  const onClose = jest.fn();

  const mockSpacesManager = spacesManagerMock.create();

  mockSpacesManager.getActiveSpace.mockResolvedValue({
    id: 'my-active-space',
    name: 'my active space',
    disabledFeatures: [],
  });

  mockSpacesManager.getSpaces.mockResolvedValue(
    opts.mockSpaces || [
      {
        id: 'space-1',
        name: 'Space 1',
        disabledFeatures: [],
      },
      {
        id: 'space-2',
        name: 'Space 2',
        disabledFeatures: [],
      },
      {
        id: 'space-3',
        name: 'Space 3',
        disabledFeatures: [],
      },
      {
        id: 'my-active-space',
        name: 'my active space',
        disabledFeatures: [],
      },
    ]
  );

  const mockToastNotifications = {
    addError: jest.fn(),
    addSuccess: jest.fn(),
  };
  const savedObjectToCopy = {
    type: 'dashboard',
    id: 'my-dash',
    references: [
      {
        type: 'visualization',
        id: 'my-viz',
        name: 'My Viz',
      },
    ],
    meta: { icon: 'dashboard', title: 'foo' },
  };

  const wrapper = mountWithIntl(
    <CopySavedObjectsToSpaceFlyout
      savedObject={savedObjectToCopy}
      spacesManager={(mockSpacesManager as unknown) as SpacesManager}
      toastNotifications={(mockToastNotifications as unknown) as ToastNotifications}
      onClose={onClose}
    />
  );

  if (!opts.returnBeforeSpacesLoad) {
    // Wait for spaces manager to complete and flyout to rerender
    await Promise.resolve();
    await Promise.resolve();
    wrapper.update();
  }

  return { wrapper, onClose, mockSpacesManager, mockToastNotifications, savedObjectToCopy };
};

describe('CopyToSpaceFlyout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('waits for spaces to load', async () => {
    const { wrapper } = await setup({ returnBeforeSpacesLoad: true });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    await Promise.resolve();
    wrapper.update();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
  });

  it('shows a message within an EuiEmptyPrompt when no spaces are available', async () => {
    const { wrapper, onClose } = await setup({ mockSpaces: [] });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('shows a message within an EuiEmptyPrompt when only the active space is available', async () => {
    const { wrapper, onClose } = await setup({
      mockSpaces: [{ id: 'my-active-space', name: '', disabledFeatures: [] }],
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('handles errors thrown from copySavedObjects API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-1']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    await Promise.resolve();

    wrapper.update();

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('handles errors thrown from resolveCopySavedObjectsErrors API call', async () => {
    const { wrapper, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          {
            type: 'index-pattern',
            id: 'conflicting-ip',
            error: { type: 'conflict' },
          },
          {
            type: 'visualization',
            id: 'my-viz',
            error: { type: 'conflict' },
          },
        ],
      },
    });

    mockSpacesManager.resolveCopySavedObjectsErrors.mockImplementation(() => {
      return Promise.reject(Boom.serverUnavailable('Something bad happened'));
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);
    act(() => {
      spaceSelector.props().onChange(['space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    await Promise.resolve();
    wrapper.update();

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalled();
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    const overwriteButton = findTestSubject(wrapper, `cts-overwrite-conflict-conflicting-ip`);
    overwriteButton.simulate('click');

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    await Promise.resolve();
    wrapper.update();

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).toHaveBeenCalled();
    expect(mockToastNotifications.addError).toHaveBeenCalled();
  });

  it('allows the form to be filled out', async () => {
    const {
      wrapper,
      onClose,
      mockSpacesManager,
      mockToastNotifications,
      savedObjectToCopy,
    } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
      },
      'space-2': {
        success: true,
        successCount: 3,
      },
    });

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    await Promise.resolve();

    wrapper.update();

    expect(mockSpacesManager.copySavedObjects).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      ['space-1', 'space-2'],
      true,
      true
    );

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });

  it('allows conflicts to be resolved', async () => {
    const {
      wrapper,
      onClose,
      mockSpacesManager,
      mockToastNotifications,
      savedObjectToCopy,
    } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          {
            type: 'index-pattern',
            id: 'conflicting-ip',
            error: { type: 'conflict' },
          },
          {
            type: 'visualization',
            id: 'my-viz',
            error: { type: 'conflict' },
          },
        ],
      },
    });

    mockSpacesManager.resolveCopySavedObjectsErrors.mockResolvedValue({
      'space-2': {
        success: true,
        successCount: 2,
      },
    });

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    await Promise.resolve();

    wrapper.update();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    const overwriteButton = findTestSubject(wrapper, `cts-overwrite-conflict-conflicting-ip`);
    overwriteButton.simulate('click');

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    await Promise.resolve();
    wrapper.update();

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).toHaveBeenCalledWith(
      [{ type: savedObjectToCopy.type, id: savedObjectToCopy.id }],
      {
        'space-2': [{ type: 'index-pattern', id: 'conflicting-ip', overwrite: true }],
      },
      true
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });

  it('displays an error when missing references are encountered', async () => {
    const { wrapper, onClose, mockSpacesManager, mockToastNotifications } = await setup();

    mockSpacesManager.copySavedObjects.mockResolvedValue({
      'space-1': {
        success: true,
        successCount: 3,
      },
      'space-2': {
        success: false,
        successCount: 1,
        errors: [
          {
            type: 'visualization',
            id: 'my-viz',
            error: {
              type: 'missing_references',
              references: [{ type: 'index-pattern', id: 'missing-index-pattern' }],
            },
          },
        ],
      },
    });

    // Using props callback instead of simulating clicks,
    // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    await Promise.resolve();

    wrapper.update();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    const spaceResult = findTestSubject(wrapper, `cts-space-result-space-2`);
    spaceResult.simulate('click');

    const errorIconTip = spaceResult.find(
      'EuiIconTip[data-test-subj="cts-object-result-error-my-viz"]'
    );

    expect(errorIconTip.props()).toMatchInlineSnapshot(`
      Object {
        "color": "danger",
        "content": <FormattedMessage
          defaultMessage="There was an error copying this saved object."
          id="xpack.spaces.management.copyToSpace.copyStatus.unresolvableErrorMessage"
          values={Object {}}
        />,
        "data-test-subj": "cts-object-result-error-my-viz",
        "type": "cross",
      }
    `);

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    expect(mockSpacesManager.resolveCopySavedObjectsErrors).not.toHaveBeenCalled();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToastNotifications.addError).not.toHaveBeenCalled();
  });
});
