/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TestingContext } from '../../../../test';
import {
  getAutoplayTextField as input,
  getAutoplayCheckbox as checkbox,
  getAutoplaySubmit as submit,
} from '../../../../test/selectors';
import { AutoplaySettings } from '../autoplay_settings.container';

describe('<AutoplaySettings />', () => {
  const wrapper = mount(
    <TestingContext>
      <AutoplaySettings />
    </TestingContext>
  );

  test('renders as expected', () => {
    expect(checkbox(wrapper).props().checked).toEqual(false);
    expect(input(wrapper).props().value).toBe('5s');
  });

  test('activates and deactivates', () => {
    checkbox(wrapper).simulate('change');
    expect(checkbox(wrapper).props().checked).toEqual(true);
    checkbox(wrapper).simulate('change');
    expect(checkbox(wrapper).props().checked).toEqual(false);
  });

  test('changes properly with input', () => {
    input(wrapper).simulate('change', { target: { value: '2asd' } });
    expect(submit(wrapper).props().disabled).toEqual(true);
    input(wrapper).simulate('change', { target: { value: '2s' } });
    expect(submit(wrapper).props().disabled).toEqual(false);
    expect(input(wrapper).props().value === '2s');
    submit(wrapper).simulate('submit');
    expect(input(wrapper).props().value === '2s');
    expect(submit(wrapper).props().disabled).toEqual(false);
  });
});
