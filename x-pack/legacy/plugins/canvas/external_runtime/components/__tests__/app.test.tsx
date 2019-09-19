/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
// import { act } from 'react-dom/test-utils';
import { App } from '../app';
import { snapshots, SnapshotNames, tick } from '../../test';
import {
  getScrubber as scrubber,
  getScrubberSlideContainer as scrubberContainer,
  getPageControlsCenter as center,
  getSettingsTrigger as trigger,
  getContextMenuItems as menuItems,
  // getAutoplayTextField as autoplayText,
  // getAutoplayCheckbox as autoplayCheck,
  // getAutoplaySubmit as autoplaySubmit,
  getToolbarCheckbox as toolbarCheck,
  getCanvas as canvas,
  getFooter as footer,
} from '../../test/selectors';
import { previousPage, currentPage, nextPage } from '../footer/__tests__/page_controls.test';

jest.mock('../../supported_renderers');

const getWrapper: (name?: SnapshotNames) => ReactWrapper = (name = 'hello') => {
  const workpad = snapshots[name];
  const { height, width } = workpad;
  const stage = {
    height,
    width,
    page: 0,
  };

  return mount(<App {...{ stage, workpad }} />);
};

describe('<App />', () => {
  test('App renders properly', () => {
    expect(getWrapper().html()).toMatchSnapshot();
  });

  test('App can be navigated', () => {
    const wrapper = getWrapper('austin');
    nextPage(wrapper).simulate('click');
    expect(currentPage(wrapper).text()).toEqual('Page 2 of 28');
    previousPage(wrapper).simulate('click');
  });

  test('scrubber opens and closes', () => {
    const wrapper = getWrapper('austin');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(false);
    center(wrapper).simulate('click');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(true);
  });

  test('can open scrubber and set page', () => {
    const wrapper = getWrapper('austin');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(false);
    center(wrapper).simulate('click');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(true);

    // Click a page preview
    scrubberContainer(wrapper)
      .childAt(3) // Get the fourth page preview
      .childAt(0) // Get the click-responding element
      .simulate('click');
    expect(center(wrapper).text()).toEqual('Page 4 of 28');

    // Focus and key press a page preview
    scrubberContainer(wrapper)
      .childAt(5) // Get the sixth page preview
      .childAt(0) // Get the click-responding element
      .simulate('focus')
      .simulate('keyPress');
    expect(center(wrapper).text()).toEqual('Page 6 of 28');
  });

  test('autohide footer functions on mouseEnter + Leave', async () => {
    const wrapper = getWrapper();
    trigger(wrapper).simulate('click');
    await tick(20);
    menuItems(wrapper)
      .at(1)
      .simulate('click');
    await tick(20);
    wrapper.update();
    expect(footer(wrapper).prop('isHidden')).toEqual(false);
    expect(footer(wrapper).prop('isAutohide')).toEqual(false);
    toolbarCheck(wrapper).simulate('change');
    expect(footer(wrapper).prop('isAutohide')).toEqual(true);
    canvas(wrapper).simulate('mouseEnter');
    expect(footer(wrapper).prop('isHidden')).toEqual(false);
    canvas(wrapper).simulate('mouseLeave');
    expect(footer(wrapper).prop('isHidden')).toEqual(true);
  });

  test('scrubber hides if open when autohide is activated', async () => {
    const wrapper = getWrapper('austin');
    center(wrapper).simulate('click');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(true);

    // Open the menu and activate toolbar hiding.
    trigger(wrapper).simulate('click');
    await tick(20);
    menuItems(wrapper)
      .at(1)
      .simulate('click');
    await tick(20);
    wrapper.update();
    toolbarCheck(wrapper).simulate('change');
    await tick(20);

    // Simulate the mouse leaving the container
    canvas(wrapper).simulate('mouseLeave');
    expect(scrubber(wrapper).prop('isScrubberVisible')).toEqual(false);
  });

  /*
  This test relies on react-dom at a version of 16.9... it can be enabled
  once renovate completes the upgrade.

  test('autoplay starts when triggered', async () => {
    const wrapper = getWrapper('austin');
    trigger(wrapper).simulate('click');
    await tick(20);
    menuItems(wrapper)
      .at(0)
      .simulate('click');
    await tick(20);
    wrapper.update();
    autoplayText(wrapper).simulate('change', { target: { value: '1s' } });
    autoplaySubmit(wrapper).simulate('submit');
    autoplayCheck(wrapper).simulate('change');
    expect(center(wrapper).text()).toEqual('Page 1 of 28');

    await act(async () => {
      await tick(1500);
    });

    wrapper.update();
    expect(center(wrapper).text()).not.toEqual('Page 1 of 28');
  });
*/
});
