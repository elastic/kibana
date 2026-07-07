/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
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
    renderWithI18n(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={1}
      />
    );
    expect(screen.getByTestId('customRecurrenceScheduler')).toBeInTheDocument();
    // customRecurrenceSchedulerFrequency is a select element
    expect(screen.getByTestId('customRecurrenceSchedulerFrequency')).toHaveValue(
      String(RRuleFrequency.DAILY)
    );
    expect(screen.queryByTestId('customRecurrenceSchedulerWeekly')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customRecurrenceSchedulerMonthly')).not.toBeInTheDocument();
  });

  test('render weekly options', () => {
    renderWithI18n(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.WEEKLY }}
        minimumRecurrenceDays={1}
      />
    );
    expect(screen.getByTestId('customRecurrenceSchedulerWeekly')).toBeInTheDocument();
    expect(screen.getByTestId('customRecurrenceSchedulerFrequency')).toHaveValue(
      String(RRuleFrequency.WEEKLY)
    );
  });

  test('render monthly options', () => {
    renderWithI18n(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.MONTHLY }}
        minimumRecurrenceDays={1}
      />
    );
    expect(screen.getByTestId('customRecurrenceSchedulerMonthly')).toBeInTheDocument();
    expect(screen.getByTestId('customRecurrenceSchedulerFrequency')).toHaveValue(
      String(RRuleFrequency.MONTHLY)
    );
  });

  test('should call onChange when state changed', async () => {
    renderWithI18n(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={1}
      />
    );

    // Change the frequency select to weekly
    await userEvent.selectOptions(
      screen.getByTestId('customRecurrenceSchedulerFrequency'),
      String(RRuleFrequency.WEEKLY)
    );
    expect(onChange).toHaveBeenCalled();
  });

  test('should enforce minimum recurrence days', async () => {
    renderWithI18n(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
        minimumRecurrenceDays={3}
      />
    );

    const intervalInput = screen.getByTestId('customRecurrenceSchedulerInterval');
    expect(intervalInput).toHaveValue(3);

    await userEvent.tripleClick(intervalInput);
    await userEvent.paste('4');
    expect(onChange).toHaveBeenCalledWith({
      bymonth: [],
      bymonthday: [],
      byweekday: [],
      freq: 3,
      interval: 4,
    });

    await userEvent.tripleClick(intervalInput);
    await userEvent.paste('1');
    expect(onChange).toHaveBeenCalledWith({
      bymonth: [],
      bymonthday: [],
      byweekday: [],
      freq: 3,
      interval: 3,
    });
  });
});
