/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DonutChart } from '../donut_chart';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

describe('DonutChart component', () => {
  it('passes correct props without errors for valid props', () => {
    const props = {
      down: 32,
      up: 95,
      height: 125,
      width: 125,
    };

    const wrapper = shallowWithIntl(<DonutChart {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a donut chart', () => {
    const props = {
      down: 32,
      up: 95,
      height: 125,
      width: 125,
    };

    const wrapper = renderWithIntl(<DonutChart {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
