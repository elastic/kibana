/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { SelectInterval } from './select_interval';

describe('SelectInterval', () => {
  test('creates correct initial selected value', () => {
    const wrapper = shallowWithIntl(<SelectInterval />);
    const defaultSelectedValue = wrapper.props().interval.val;

    expect(defaultSelectedValue).toBe('auto');
  });

  test('currently selected value is updated correctly on click', () => {
    const wrapper = shallowWithIntl(<SelectInterval />);
    const select = wrapper.first().shallow();

    const defaultSelectedValue = wrapper.props().interval.val;
    expect(defaultSelectedValue).toBe('auto');

    select.simulate('change', { target: { value: 'day' } });
    const updatedSelectedValue = wrapper.props().interval.val;
    expect(updatedSelectedValue).toBe('day');
  });
});
