/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Context } from '../../../../context/mock';
import { ToolbarSettings } from '../toolbar_settings.container';

describe('<ToolbarSettings />', () => {
  const wrapper = mount(
    <Context>
      <ToolbarSettings />
    </Context>
  );

  const checkbox = () => wrapper.find('input[name="toolbarHide"].euiSwitch__input');

  test('renders as expected', () => {
    expect(checkbox().props().checked).toBeFalsy();
  });

  test('activates and deactivates', () => {
    checkbox().simulate('change');
    expect(checkbox().props().checked).toBeTruthy();
    checkbox().simulate('change');
    expect(checkbox().props().checked).toBeFalsy();
  });
});
