/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetricsTimeControls } from './time_controls';
import { mount } from 'enzyme';
import moment from 'moment';
import { InfraTimerangeInput } from '../../graphql/types';
import DateMath from '@elastic/datemath';

describe('MetricsTimeControls', () => {
  it('should set a valid from and to value for Today', () => {
    const currentTimeRange = {
      from: moment()
        .subtract(15, 'm')
        .valueOf(),
      to: moment().valueOf(),
      interval: '>=1m',
    };
    const handleTimeChange = jest.fn().mockImplementation((time: InfraTimerangeInput) => void 0);
    const handleRefreshChange = jest.fn().mockImplementation((refreshInterval: number) => void 0);
    const handleAutoReload = jest.fn().mockImplementation((isAutoReloading: boolean) => void 0);
    const component = mount(
      <MetricsTimeControls
        currentTimeRange={currentTimeRange}
        onChangeTimeRange={handleTimeChange}
        setRefreshInterval={handleRefreshChange}
        setAutoReload={handleAutoReload}
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
    const expectedFrom = DateMath.parse('now/d');
    const expectedTo = DateMath.parse('now/d', { roundUp: true });
    if (!expectedFrom || !expectedTo) {
      throw new Error('This should never happen!');
    }
    expect(timeRangeInput.from).toBe(expectedFrom.valueOf());
    expect(timeRangeInput.to).toBe(expectedTo.valueOf());
  });
});
