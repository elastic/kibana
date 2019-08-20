/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
let mockSpaces: Space[] = [];
let mockIsLoading = true;
jest.mock('../../../../lib/hooks', () => {
  return {
    useKibanaSpaces: () => {
      return {
        isLoading: mockIsLoading,
        spaces: mockSpaces,
      };
    },
  };
});
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { CopySavedObjectsToSpaceFlyout } from './copy_to_space_flyout';
import { CopyToSpaceForm } from './copy_to_space_form';
import { EuiLoadingSpinner, EuiEmptyPrompt } from '@elastic/eui';
import { Space } from '../../../../../common/model/space';
import { findTestSubject } from 'test_utils/find_test_subject';
import { SelectableSpacesControl } from './selectable_spaces_control';
import { act } from 'react-testing-library';
import { ProcessingCopyToSpace } from './processing_copy_to_space';

const mountComponent = () => {
  const onClose = jest.fn();
  const wrapper = mountWithIntl(
    <CopySavedObjectsToSpaceFlyout
      savedObject={{
        type: 'dashboard',
        id: 'my-dash',
        references: [],
        meta: { icon: 'dashboard', title: 'foo' },
      }}
      onClose={onClose}
    />
  );

  return { wrapper, onClose };
};

describe('CopyToSpaceFlyout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it('waits for spaces to load', () => {
    let { wrapper } = mountComponent();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);

    wrapper.unmount();

    mockIsLoading = false;
    mockSpaces = [{ id: 'foo', name: 'Foo Space', disabledFeatures: [] }];

    wrapper = mountComponent().wrapper;

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);
  });

  it('shows a message within an EuiEmptyPrompt when no spaces are available', () => {
    mockIsLoading = false;
    mockSpaces = [];

    const { wrapper, onClose } = mountComponent();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(0);
  });

  it('allows the form to be filled out', () => {
    mockIsLoading = false;
    mockSpaces = [
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
    ];

    const { wrapper, onClose } = mountComponent();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(1);
    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(0);

    const includeRelatedSwitch = findTestSubject(wrapper, 'cts-form-include-related-objects');

    const overwriteSwitch = findTestSubject(wrapper, 'cts-form-overwrite');

    // Using props callback instead of simulating clicks,
    // because EuiSelectableuses a virtualized list, which isn't easily testable via test subjects
    const spaceSelector = wrapper.find(SelectableSpacesControl);

    act(() => {
      includeRelatedSwitch.simulate('click');
      overwriteSwitch.simulate('click');
      spaceSelector.props().onChange(['space-1', 'space-2']);
    });

    const startButton = findTestSubject(wrapper, 'cts-initiate-button');
    act(() => {
      startButton.simulate('click');
    });

    wrapper.update();

    expect(wrapper.find(CopyToSpaceForm)).toHaveLength(0);
    expect(wrapper.find(ProcessingCopyToSpace)).toHaveLength(1);

    // temporary while mock calls are in place
    act(() => jest.advanceTimersByTime(60000));
    wrapper.update();

    const finishButton = findTestSubject(wrapper, 'cts-finish-button');
    act(() => {
      finishButton.simulate('click');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
