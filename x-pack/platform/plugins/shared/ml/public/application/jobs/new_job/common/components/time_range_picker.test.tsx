/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DateRangePicker } from '@kbn/date-range-picker';
import { TimeRangePicker } from './time_range_picker';

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: jest.fn(() => null),
}));

jest.mock('@kbn/date-range-picker-presets', () => ({
  useDateRangePickerPresets: jest.fn(() => ({ presets: [] })),
}));

jest.mock('../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      uiSettings: { get: jest.fn((key: string) => (key === 'dateFormat' ? 'MMM D, YYYY' : 'UTC')) },
      data: { dateRangePickerPresets: {} },
      notifications: {},
      http: { basePath: { prepend: jest.fn((path: string) => path) } },
    },
  }),
}));

const MockedDateRangePicker = DateRangePicker as jest.MockedFunction<typeof DateRangePicker>;

const timeRange = {
  start: Date.UTC(2016, 1, 7),
  end: Date.UTC(2016, 1, 11),
};

describe('TimeRangePicker', () => {
  beforeEach(() => {
    MockedDateRangePicker.mockClear();
  });

  test('shows the time range as an absolute range', () => {
    render(<TimeRangePicker setTimeRange={jest.fn()} timeRange={timeRange} />);

    expect(MockedDateRangePicker.mock.calls[0][0].value).toBe(
      '2016-02-07T00:00:00.000Z to 2016-02-11T00:00:00.000Z'
    );
  });

  test('sets the time range from a valid picker change', () => {
    const setTimeRange = jest.fn();
    render(<TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />);

    MockedDateRangePicker.mock.calls[0][0].onChange({
      start: 'now-7d',
      end: 'now',
      startDate: new Date(Date.UTC(2016, 1, 8)),
      endDate: new Date(Date.UTC(2016, 1, 9)),
      value: 'last 7 days',
      isInvalid: false,
    });

    expect(setTimeRange).toHaveBeenCalledWith({
      start: Date.UTC(2016, 1, 8),
      end: Date.UTC(2016, 1, 9),
    });
  });

  test('does not set the time range from an invalid picker change', () => {
    const setTimeRange = jest.fn();
    render(<TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />);

    MockedDateRangePicker.mock.calls[0][0].onChange({
      start: '',
      end: '',
      startDate: null,
      endDate: null,
      value: 'not a date',
      isInvalid: true,
    });

    expect(setTimeRange).not.toHaveBeenCalled();
  });
});
