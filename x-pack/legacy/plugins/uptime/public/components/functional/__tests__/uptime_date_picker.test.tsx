/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { UptimeDatePicker, CommonlyUsedRange } from '../uptime_date_picker';

describe('UptimeDatePicker component', () => {
  let commonlyUsedRange: CommonlyUsedRange[];

  beforeEach(() => {
    commonlyUsedRange = [
      { from: 'now/d', to: 'now/d', display: 'Today' },
      { from: 'now/w', to: 'now/w', display: 'This week' },
      { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
      { from: 'now-30m', to: 'now', display: 'Last 30 minutes' },
      { from: 'now-1h', to: 'now', display: 'Last 1 hour' },
      { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
      { from: 'now-7d', to: 'now', display: 'Last 7 days' },
      { from: 'now-30d', to: 'now', display: 'Last 30 days' },
      { from: 'now-90d', to: 'now', display: 'Last 90 days' },
      { from: 'now-1y', to: 'now', display: 'Last 2 year' },
    ];
  });

  it('validates props with shallow render', () => {
    const component = shallowWithIntl(
      <UptimeDatePicker commonlyUsedRanges={commonlyUsedRange} refreshApp={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithIntl(
      <UptimeDatePicker commonlyUsedRanges={commonlyUsedRange} refreshApp={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly without commonlyUsedRanges prop', () => {
    const component = renderWithIntl(<UptimeDatePicker refreshApp={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });
});
