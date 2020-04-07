/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { set } from 'lodash/fp';
import React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { apolloClientObservable, mockGlobalState, TestProviders } from '../../mock';
import { createStore, State } from '../../store';
import { mockDataProviders } from '../timeline/data_providers/mock/mock_data_providers';

import { Flyout, FlyoutComponent } from '.';
import { FlyoutButton } from './button';

jest.mock('../timeline', () => ({
  // eslint-disable-next-line react/display-name
  StatefulTimeline: () => <div />,
}));

const testFlyoutHeight = 980;
const usersViewing = ['elastic'];

describe('Flyout', () => {
  const state: State = mockGlobalState;

  describe('rendering', () => {
    test('it renders correctly', () => {
      const wrapper = mount(
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        { wrappingComponent: TestProviders }
      );

      expect(wrapper.find('Flyout')).toHaveLength(1);
    });

    test('it renders the default flyout state as a button', () => {
      const wrapper = mount(
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        { wrappingComponent: TestProviders }
      );

      expect(
        wrapper
          .find('[data-test-subj="flyout-button-not-ready-to-drop"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('it does NOT render the fly out button when its state is set to flyout is true', () => {
      const stateShowIsTrue = set('timeline.timelineById.test.show', true, state);
      const storeShowIsTrue = createStore(stateShowIsTrue, apolloClientObservable);

      const wrapper = mount(
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        { wrappingComponent: TestProviders, wrappingComponentProps: { store: storeShowIsTrue } }
      );

      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        false
      );
    });

    test('it does render the data providers badge when the number is greater than 0', () => {
      const stateWithDataProviders = set(
        'timeline.timelineById.test.dataProviders',
        mockDataProviders,
        state
      );
      const storeWithDataProviders = createStore(stateWithDataProviders, apolloClientObservable);

      const wrapper = mount(
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        {
          wrappingComponent: TestProviders,
          wrappingComponentProps: { store: storeWithDataProviders },
        }
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
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        {
          wrappingComponent: TestProviders,
          wrappingComponentProps: { store: storeWithDataProviders },
        }
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
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        { wrappingComponent: TestProviders }
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
        <Flyout flyoutHeight={testFlyoutHeight} timelineId="test" usersViewing={usersViewing} />,
        {
          wrappingComponent: TestProviders,
          wrappingComponentProps: { store: storeWithDataProviders },
        }
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
        <FlyoutComponent
          dataProviders={mockDataProviders}
          flyoutHeight={testFlyoutHeight}
          show={false}
          showTimeline={showTimeline}
          timelineId="test"
          width={100}
          usersViewing={usersViewing}
        />,
        { wrappingComponent: TestProviders }
      );

      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(showTimeline).toBeCalled();
    });
  });

  describe('showFlyoutButton', () => {
    test('should show the flyout button when show is true', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <FlyoutButton
          dataProviders={mockDataProviders}
          show={true}
          timelineId="test"
          onOpen={openMock}
        />,
        { wrappingComponent: TestProviders }
      );
      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        true
      );
    });

    test('should NOT show the flyout button when show is false', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <FlyoutButton
          dataProviders={mockDataProviders}
          show={false}
          timelineId="test"
          onOpen={openMock}
        />,
        { wrappingComponent: TestProviders }
      );
      expect(wrapper.find('[data-test-subj="flyout-button-not-ready-to-drop"]').exists()).toEqual(
        false
      );
    });

    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const wrapper = mount(
        <FlyoutButton
          dataProviders={mockDataProviders}
          show={true}
          timelineId="test"
          onOpen={openMock}
        />,
        { wrappingComponent: TestProviders }
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
        <FlyoutButton
          dataProviders={mockDataProviders}
          show={true}
          timelineId="test"
          onOpen={openMock}
        />,
        { wrappingComponent: TestProviders }
      );
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('click');

      expect(openMock).toBeCalled();
    });
  });
});
