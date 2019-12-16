/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../mock';
import { flyoutHeaderHeight } from '..';
import { Pane } from '.';

const testFlyoutHeight = 980;
const testWidth = 640;
const usersViewing = ['elastic'];

jest.mock('../../../lib/kibana');

jest.mock('ui/vis/lib/timezone', () => ({
  timezoneProvider: () => () => 'America/New_York',
}));

describe('Pane', () => {
  test('renders correctly against snapshot', () => {
    const EmptyComponent = shallow(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );
    expect(toJson(EmptyComponent.find('Pane'))).toMatchSnapshot();
  });

  test('it should NOT let the flyout expand to take up the full width of the element that contains it', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="eui-flyout"]').get(0).props.maxWidth).toEqual('95%');
  });

  test('it applies timeline styles to the EuiFlyout', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="eui-flyout"]')
        .first()
        .hasClass('timeline-flyout')
    ).toEqual(true);
  });

  test('it applies timeline styles to the EuiFlyoutHeader', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="eui-flyout-header"]')
        .first()
        .hasClass('timeline-flyout-header')
    ).toEqual(true);
  });

  test('it applies timeline styles to the EuiFlyoutBody', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="eui-flyout-body"]')
        .first()
        .hasClass('timeline-flyout-body')
    ).toEqual(true);
  });

  test('it should render a resize handle', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="flyout-resize-handle"]')
        .first()
        .exists()
    ).toEqual(true);
  });

  test('it should render an empty title', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a child of flyout'}</span>
        </Pane>
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="timeline-title"]')
        .first()
        .text()
    ).toContain('');
  });

  test('it should render the flyout body', () => {
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={jest.fn()}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a mock body'}</span>
        </Pane>
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="eui-flyout-body"]')
        .first()
        .text()
    ).toContain('I am a mock body');
  });

  test('it should invoke onClose when the close button is clicked', () => {
    const closeMock = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <Pane
          flyoutHeight={testFlyoutHeight}
          headerHeight={flyoutHeaderHeight}
          onClose={closeMock}
          timelineId={'test'}
          usersViewing={usersViewing}
          width={testWidth}
        >
          <span>{'I am a mock child'}</span>
        </Pane>
      </TestProviders>
    );
    wrapper
      .find('[data-test-subj="close-timeline"] button')
      .first()
      .simulate('click');

    expect(closeMock).toBeCalled();
  });
});
