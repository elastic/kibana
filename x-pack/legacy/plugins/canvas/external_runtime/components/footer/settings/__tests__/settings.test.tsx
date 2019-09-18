/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { Context } from '../../../../context/mock';
import { Settings } from '../settings.container';
import { takeMountedSnapshot, tick } from '../../../../test';

jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

describe('<Settings />', () => {
  let wrapper: ReactWrapper;

  const settings = () => wrapper.find('EuiButtonIcon');
  const popover = () => wrapper.find('EuiPopover');
  const portal = () => wrapper.find('EuiPortal');
  const menuItems = () => wrapper.find('EuiContextMenuItem');

  beforeEach(() => {
    const ref = React.createRef<HTMLDivElement>();
    wrapper = mount(
      <Context stageRef={ref}>
        <div ref={ref}>
          <Settings />
        </div>
      </Context>
    );
  });

  test('renders as expected', () => {
    expect(settings().exists()).toBeTruthy();
    expect(portal().exists()).toBeFalsy();
  });

  test('clicking settings opens and closes the menu', () => {
    settings().simulate('click');
    expect(portal().exists()).toBeTruthy();
    expect(popover().prop('isOpen')).toBeTruthy();
    expect(menuItems().length).toEqual(2);
    expect(portal().text()).toEqual('SettingsAuto PlayToolbar');
    settings().simulate('click');
    expect(popover().prop('isOpen')).toBeFalsy();
  });

  test('can navigate Autoplay Settings', async () => {
    settings().simulate('click');
    expect(takeMountedSnapshot(portal())).toMatchSnapshot();
    await tick(20);
    menuItems()
      .slice(0, 1)
      .simulate('click');
    await tick(20);
    expect(takeMountedSnapshot(portal())).toMatchSnapshot();
  });

  test('can navigate Toolbar Settings, closes when activated', async () => {
    settings().simulate('click');
    expect(takeMountedSnapshot(portal())).toMatchSnapshot();
    menuItems()
      .slice(1, 2)
      .simulate('click');

    // Wait for the animation and DOM update
    await tick(20);
    portal().update();
    expect(portal().html()).toMatchSnapshot();

    // Click the Hide Toolbar switch
    portal()
      .find('input[data-test-subj="hideToolbarSwitch"]')
      .simulate('change');

    // Wait for the animation and DOM update
    await tick(20);
    portal().update();

    // The Portal should not be open.
    expect(popover().prop('isOpen')).toBeFalsy();
    expect(portal().html()).toMatchSnapshot();
  });
});
