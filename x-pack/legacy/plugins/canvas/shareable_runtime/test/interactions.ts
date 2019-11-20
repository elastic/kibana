/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { getSettingsTrigger, getPortal, getContextMenuItems } from './selectors';
import { waitFor } from './utils';

export const openSettings = async function(wrapper: ReactWrapper) {
  getSettingsTrigger(wrapper).simulate('click');

  try {
    // Wait for EuiPanel to be visible
    await waitFor(() => {
      wrapper.update();

      return getPortal(wrapper)
        .find('EuiPanel')
        .exists();
    });
  } catch (e) {
    throw new Error('Settings Panel did not open in given time');
  }
};

export const selectMenuItem = async function(wrapper: ReactWrapper, menuItemIndex: number) {
  getContextMenuItems(wrapper)
    .at(menuItemIndex)
    .simulate('click');

  try {
    // When the menu item is clicked, wait for all of the context menus to be there
    await waitFor(() => {
      wrapper.update();
      return getPortal(wrapper).find('EuiContextMenuPanel').length === 2;
    });
  } catch (e) {
    throw new Error('Context menu did not transition');
  }
};
