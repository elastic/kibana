/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import moment from 'moment';
import React from 'react';
import { RRuleFrequency } from '../../../../../../types';
import { CustomRecurrenceScheduler } from './custom_recurrence_scheduler';

describe('CustomRecurrenceScheduler', () => {
  const startDate = moment('11/23/1979');
  const initialState = {
    freq: RRuleFrequency.DAILY,
    interval: 1,
    byweekday: [],
    bymonthday: [],
    bymonth: [],
  };
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  test('render', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={1}
      />
    );
    expect(wrapper.find('[data-test-subj="customRecurrenceScheduler"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.DAILY);
    expect(wrapper.find('[data-test-subj="customRecurrenceSchedulerWeekly"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerMonthly"]').exists()
    ).toBeFalsy();
  });

  test('render weekly options', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.WEEKLY }}
        minimumRecurrenceDays={1}
      />
    );
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerWeekly"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.WEEKLY);
  });

  test('render monthly options', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.MONTHLY }}
        minimumRecurrenceDays={1}
      />
    );
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerMonthly"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.MONTHLY);
  });

  test('should call onChange when state changed ', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={1}
      />
    );

    wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().simulate('click');
    wrapper.find('option[data-test-subj="ruleSnoozeSchedulerRecurWeek"]').first().simulate('click');
    expect(onChange).toHaveBeenCalled();
  });

  test('should enforce minimum recurrence days', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={3}
      />
    );
    expect(
      wrapper.find('input[data-test-subj="customRecurrenceSchedulerInterval"]').first().props()
        .value
    ).toEqual(3);
    wrapper
      .find('input[data-test-subj="customRecurrenceSchedulerInterval"]')
      .first()
      .simulate('change', { target: { value: 4 } });
    expect(onChange).toHaveBeenCalledWith({
      bymonth: [],
      bymonthday: [],
      byweekday: [],
      freq: 3,
      interval: 4,
    });
    wrapper
      .find('input[data-test-subj="customRecurrenceSchedulerInterval"]')
      .first()
      .simulate('change', { target: { value: 1 } });
    expect(onChange).toHaveBeenCalledWith({
      bymonth: [],
      bymonthday: [],
      byweekday: [],
      freq: 3,
      interval: 3,
    });
  });
});
