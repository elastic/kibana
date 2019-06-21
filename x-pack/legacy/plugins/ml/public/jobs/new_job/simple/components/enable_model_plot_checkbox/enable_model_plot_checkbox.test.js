/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { EnableModelPlotCheckbox } from './enable_model_plot_checkbox_view.js';

const defaultProps = {
  checkboxText: 'Enable model plot',
  onCheckboxChange: () => {},
  warningStatus: false,
  warningContent: 'Test warning content',
};

describe('EnableModelPlotCheckbox', () => {

  test('checkbox default is rendered correctly', () => {
    const wrapper = mountWithIntl(<EnableModelPlotCheckbox {...defaultProps} />);
    const checkbox = wrapper.find({ type: 'checkbox' });
    const label = wrapper.find('label');

    expect(checkbox.props().checked).toBe(false);
    expect(label.text()).toBe('Enable model plot');
  });

  test('onCheckboxChange function prop is called when checkbox is toggled', () => {
    const mockOnChange = jest.fn();
    defaultProps.onCheckboxChange = mockOnChange;

    const wrapper = mountWithIntl(<EnableModelPlotCheckbox {...defaultProps} />);
    const checkbox = wrapper.find({ type: 'checkbox' });

    checkbox.simulate('change', { target: { checked: true } });
    expect(mockOnChange).toBeCalled();
  });

});
