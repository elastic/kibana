/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { JestContext } from '../../../../test/context_jest';
import { takeMountedSnapshot, tick } from '../../../../test';
import {
  getSettingsTrigger as trigger,
  getPopover as popover,
  getPortal as portal,
  getContextMenuItems as menuItems,
} from '../../../../test/selectors';
import { Settings } from '../settings.container';

jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);
jest.mock('@elastic/eui/lib/components/portal/portal', () => {
  // eslint-disable-next-line no-shadow
  const React = require.requireActual('react');
  return {
    EuiPortal: (props: any) => <div>{props.children}</div>,
  };
});

describe('<Settings />', () => {
  let wrapper: ReactWrapper;

  beforeEach(() => {
    const ref = React.createRef<HTMLDivElement>();
    wrapper = mount(
      <JestContext stageRef={ref}>
        <div ref={ref}>
          <Settings />
        </div>
      </JestContext>
    );
  });

  test('renders as expected', () => {
    expect(trigger(wrapper).exists()).toEqual(true);
    expect(portal(wrapper).exists()).toEqual(false);
  });

  test('clicking settings opens and closes the menu', () => {
    trigger(wrapper).simulate('click');
    expect(portal(wrapper).exists()).toEqual(true);
    expect(popover(wrapper).prop('isOpen')).toEqual(true);
    expect(menuItems(wrapper).length).toEqual(2);
    expect(portal(wrapper).text()).toEqual('SettingsAuto PlayToolbar');
    trigger(wrapper).simulate('click');
    expect(popover(wrapper).prop('isOpen')).toEqual(false);
  });

  test('can navigate Autoplay Settings', async () => {
    trigger(wrapper).simulate('click');
    expect(takeMountedSnapshot(portal(wrapper))).toMatchSnapshot();
    await tick(20);
    menuItems(wrapper)
      .at(0)
      .simulate('click');
    await tick(20);
    expect(takeMountedSnapshot(portal(wrapper))).toMatchSnapshot();
  });

  test('can navigate Toolbar Settings, closes when activated', async () => {
    trigger(wrapper).simulate('click');
    expect(takeMountedSnapshot(portal(wrapper))).toMatchSnapshot();
    menuItems(wrapper)
      .at(1)
      .simulate('click');

    // Wait for the animation and DOM update
    await tick(20);
    portal(wrapper).update();
    expect(portal(wrapper).html()).toMatchSnapshot();

    // Click the Hide Toolbar switch
    portal(wrapper)
      .find('input[data-test-subj="hideToolbarSwitch"]')
      .simulate('change');

    // Wait for the animation and DOM update
    await tick(20);
    portal(wrapper).update();

    // The Portal should not be open.
    expect(popover(wrapper).prop('isOpen')).toEqual(false);
    expect(portal(wrapper).html()).toMatchSnapshot();
  });
});
