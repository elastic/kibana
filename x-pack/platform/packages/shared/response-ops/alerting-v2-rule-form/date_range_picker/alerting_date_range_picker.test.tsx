/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DateRangePickerOnChangeProps, DateRangePickerProps } from '@kbn/date-range-picker';
import { AlertingDateRangePicker } from './alerting_date_range_picker';

const mockOnChange = jest.fn();
let lastPickerProps: DateRangePickerProps | undefined;

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: (props: DateRangePickerProps) => {
    lastPickerProps = props;
    return (
      <button
        type="button"
        data-test-subj={props['data-test-subj'] ?? 'mockDateRangePicker'}
        onClick={() => {
          props.onChange({
            start: 'now-1h',
            end: 'now',
            startDate: null,
            endDate: null,
            value: 'Last 1 hour',
            isInvalid: false,
          });
        }}
      >
        mock picker
      </button>
    );
  },
}));

jest.mock('@kbn/date-range-picker-presets', () => ({
  useDateRangePickerPresets: () => ({
    presets: [{ start: 'now-15m', end: 'now', label: 'Last 15 minutes' }],
    onPresetSave: jest.fn(),
    onPresetDelete: jest.fn(),
  }),
}));

const data = dataPluginMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

describe('AlertingDateRangePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastPickerProps = undefined;
    mockOnChange.mockClear();
  });

  it('propagates a valid onChange as { from, to }', async () => {
    const user = userEvent.setup();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        data={data}
        notifications={notifications}
        data-test-subj="alertingDateRangePicker"
      />
    );

    await user.click(screen.getByTestId('alertingDateRangePicker'));

    expect(mockOnChange).toHaveBeenCalledWith({ from: 'now-1h', to: 'now' });
  });

  it('ignores invalid onChange commits', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        data={data}
        notifications={notifications}
      />
    );

    const invalid: DateRangePickerOnChangeProps = {
      start: 'bad',
      end: 'worse',
      startDate: null,
      endDate: null,
      value: 'bad',
      isInvalid: true,
    };
    lastPickerProps?.onChange(invalid);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('includes autoRefresh settings when onRefresh is provided', () => {
    const onRefresh = jest.fn();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        data={data}
        notifications={notifications}
        onRefresh={onRefresh}
      />
    );

    expect(lastPickerProps?.onRefresh).toBe(onRefresh);
    expect(lastPickerProps?.settings.autoRefresh).toEqual(
      expect.objectContaining({
        isEnabled: false,
        isPaused: true,
        intervalMs: 60_000,
      })
    );
  });

  it('omits autoRefresh settings when onRefresh is absent', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        data={data}
        notifications={notifications}
      />
    );

    expect(lastPickerProps?.onRefresh).toBeUndefined();
    expect(lastPickerProps?.settings.autoRefresh).toBeUndefined();
  });
});
