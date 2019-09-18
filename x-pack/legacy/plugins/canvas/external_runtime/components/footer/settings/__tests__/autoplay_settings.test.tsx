/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Context } from '../../../../context/mock';
import { AutoplaySettings } from '../autoplay_settings.container';

describe('<AutoplaySettings />', () => {
  const wrapper = mount(
    <Context>
      <AutoplaySettings />
    </Context>
  );

  const checkbox = () => wrapper.find('EuiSwitch').find('input[type="checkbox"]');
  const input = () => wrapper.find('EuiFieldText').find('input[type="text"]');
  const submit = () => wrapper.find('EuiButton');

  test('renders as expected', () => {
    expect(checkbox().props().checked).toBeFalsy();
    expect(input().props().value).toBe('5s');
  });

  test('activates and deactivates', () => {
    checkbox().simulate('change');
    expect(checkbox().props().checked).toBeTruthy();
    checkbox().simulate('change');
    expect(checkbox().props().checked).toBeFalsy();
  });

  test('changes properly with input', () => {
    input().simulate('change', { target: { value: '2asd' } });
    expect(submit().props().disabled).toBeTruthy();
    input().simulate('change', { target: { value: '2s' } });
    expect(submit().props().disabled).toBeFalsy();
    expect(input().props().value === '2s');
    submit().simulate('submit');
    expect(input().props().value === '2s');
    expect(submit().props().disabled).toBeFalsy();
  });
});
