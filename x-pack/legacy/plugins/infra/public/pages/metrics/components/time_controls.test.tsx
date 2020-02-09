/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetricsTimeControls } from './time_controls';
import { mount } from 'enzyme';
import { MetricsTimeInput } from '../containers/with_metrics_time';

describe('MetricsTimeControls', () => {
  it('should set a valid from and to value for Today', () => {
    const currentTimeRange = {
      from: 'now-15m',
      to: 'now',
      interval: '>=1m',
    };
    const handleTimeChange = jest.fn().mockImplementation((time: MetricsTimeInput) => void 0);
    const handleRefreshChange = jest.fn().mockImplementation((refreshInterval: number) => void 0);
    const handleAutoReload = jest.fn().mockImplementation((isAutoReloading: boolean) => void 0);
    const handleOnRefresh = jest.fn().mockImplementation(() => void 0);
    const component = mount(
      <MetricsTimeControls
        currentTimeRange={currentTimeRange}
        onChangeTimeRange={handleTimeChange}
        setRefreshInterval={handleRefreshChange}
        setAutoReload={handleAutoReload}
        onRefresh={handleOnRefresh}
      />
    );
    component
      .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
      .first()
      .simulate('click');
    component
      .find('[data-test-subj="superDatePickerCommonlyUsed_Today"]')
      .first()
      .simulate('click');
    expect(handleTimeChange.mock.calls.length).toBe(1);
    const timeRangeInput = handleTimeChange.mock.calls[0][0];
    expect(timeRangeInput.from).toBe('now/d');
    expect(timeRangeInput.to).toBe('now/d');
  });
});
