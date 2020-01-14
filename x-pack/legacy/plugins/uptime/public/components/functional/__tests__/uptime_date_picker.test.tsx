/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { UptimeDatePicker } from '../uptime_date_picker';

describe('UptimeDatePicker component', () => {
  it('validates props with shallow render', () => {
    const component = shallowWithIntl(<UptimeDatePicker refreshApp={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithIntl(<UptimeDatePicker refreshApp={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('renders properly without commonlyUsedRanges prop', () => {
    const component = renderWithIntl(<UptimeDatePicker refreshApp={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });
});
