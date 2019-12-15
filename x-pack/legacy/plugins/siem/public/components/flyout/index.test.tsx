/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { set } from 'lodash/fp';
import * as React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import { createStore, State } from '../../store';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';

import { Flyout, FlyoutComponent, flyoutHeaderHeight } from '.';
import { FlyoutButton } from './button';

const testFlyoutHeight = 980;
const usersViewing = ['elastic'];

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('Flyout', () => {
  const state: State = mockGlobalState;

  describe('rendering', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );
      expect(toJson(wrapper.find('Flyout'))).toMatchSnapshot();
    });

    test('it renders the default flyout state as a button', () => {
      const wrapper = mount(
        <TestProviders>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="flyout-button-not-ready-to-drop"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('it renders the title field when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeShowIsTrue}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="timeline-title"]')
          .first()
          .props().placeholder
      ).toContain('Untitled Timeline');
    });

    test('it does NOT render the fly out button when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeShowIsTrue}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        false
      );
    });

    test('it renders the flyout body', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeShowIsTrue}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          >
            <p>{'Fake flyout body'}</p>
          </Flyout>
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="eui-flyout-body"]')
          .first()
          .text()
      ).toContain('Fake flyout body');
    });

    test('it does render the data providers badge when the number is greater than 0', () => {
      const stateWithDataProviders = set(
        'timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeWithDataProviders}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="badge"]').exists()).toEqual(true);
    });

    test('it renders the correct number of data providers badge when the number is greater than 0', () => {
      const stateWithDataProviders = set(
        'timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeWithDataProviders}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="badge"]')
          .first()
          .text()
      ).toContain('10');
    });

    test('it hides the data providers badge when the timeline does NOT have data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="badge"]')
          .first()
          .props().style!.visibility
      ).toEqual('hidden');
    });

    test('it does NOT hide the data providers badge when the timeline has data providers', () => {
      const stateWithDataProviders = set(
        'timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders, apolloClientObservable);

      const wrapper = mount(
        <TestProviders store={storeWithDataProviders}>
          <Flyout
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="badge"]')
          .first()
          .props().style!.visibility
      ).toEqual('inherit');
    });

    test('should call the onOpen when the mouse is clicked for rendering', () => {
      const showTimeline = (jest.fn() as unknown) as ActionCreator<{ id: string; show: boolean }>;
      const wrapper = mount(
        <TestProviders>
          <FlyoutComponent
            dataProviders={mockDataProviders}
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            show={false}
            showTimeline={showTimeline}
            timelineId="test"
            width={100}
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(showTimeline).toBeCalled();
    });

    test('should call the onClose when the close button is clicked', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue, apolloClientObservable);

      const showTimeline = (jest.fn() as unknown) as ActionCreator<{ id: string; show: boolean }>;
      const wrapper = mount(
        <TestProviders store={storeShowIsTrue}>
          <FlyoutComponent
            dataProviders={mockDataProviders}
            flyoutHeight={testFlyoutHeight}
            headerHeight={flyoutHeaderHeight}
            show={true}
            width={100}
            showTimeline={showTimeline}
            timelineId="test"
            usersViewing={usersViewing}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="close-timeline"] button')
        .first()
        .simulate('click');

      expect(showTimeline).toBeCalled();
    });
  });

  describe('showFlyoutButton', () => {
    test('should show the flyout button when show is true', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <FlyoutButton
            dataProviders={mockDataProviders}
            show={true}
            timelineId="test"
            onOpen={openMock}
          />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        true
      );
    });

    test('should NOT show the flyout button when show is false', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <FlyoutButton
            dataProviders={mockDataProviders}
            show={false}
            timelineId="test"
            onOpen={openMock}
          />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        false
      );
    });

    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <FlyoutButton
            dataProviders={mockDataProviders}
            show={true}
            timelineId="test"
            onOpen={openMock}
          />
        </TestProviders>
      );
      expect(
        wrapper
          .find('[data-test-subj="flyout-button-not-ready-to-drop"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('should call the onOpen when it is clicked', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <FlyoutButton
            dataProviders={mockDataProviders}
            show={true}
            timelineId="test"
            onOpen={openMock}
          />
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(openMock).toBeCalled();
    });
  });
});
