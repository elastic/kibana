/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DateRangePickerOnChangeProps, DateRangePickerProps } from '@kbn/date-range-picker';
import { AlertingDateRangePicker } from './alerting_date_range_picker';
import type { AlertingDateRangePickerServices } from './alerting_date_range_picker';

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

const mockUseDateRangePickerPresets = jest.fn(() => ({
  presets: [{ start: 'now-15m', end: 'now', label: 'Last 15 minutes' }],
  onPresetSave: jest.fn(),
  onPresetDelete: jest.fn(),
}));

jest.mock('@kbn/date-range-picker-presets', () => ({
  useDateRangePickerPresets: (...args: unknown[]) => mockUseDateRangePickerPresets(...args),
}));

const data = dataPluginMock.createStartContract();
const core = coreMock.createStart();
const services: AlertingDateRangePickerServices = {
  data,
  notifications: core.notifications,
  http: core.http,
  application: core.application,
  uiSettings: core.uiSettings,
};

describe('AlertingDateRangePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastPickerProps = undefined;
    mockOnChange.mockClear();
    (data.query.timefilter.history.get as jest.Mock).mockReturnValue([]);
  });

  it('propagates a valid onChange as { from, to }', async () => {
    const user = userEvent.setup();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        data-test-subj="alertingDateRangePicker"
      />
    );

    await user.click(screen.getByTestId('alertingDateRangePicker'));

    expect(mockOnChange).toHaveBeenCalledWith({ from: 'now-1h', to: 'now' });
    expect(data.query.timefilter.history.add).toHaveBeenCalledWith({ from: 'now-1h', to: 'now' });
  });

  it('ignores invalid onChange commits', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
      />
    );

    expect(lastPickerProps).toBeDefined();

    const invalid: DateRangePickerOnChangeProps = {
      start: 'bad',
      end: 'worse',
      startDate: null,
      endDate: null,
      value: 'bad',
      isInvalid: true,
    };
    act(() => {
      lastPickerProps!.onChange(invalid);
    });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(data.query.timefilter.history.add).not.toHaveBeenCalled();
  });

  it('includes autoRefresh settings when onRefresh is provided', () => {
    const onRefresh = jest.fn();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
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
        services={services}
      />
    );

    expect(lastPickerProps?.onRefresh).toBeUndefined();
    expect(lastPickerProps?.settings.autoRefresh).toBeUndefined();
  });

  it('forwards time zone, date format, and advanced settings access from uiSettings/http/application', () => {
    (core.uiSettings.get as jest.Mock).mockImplementation((key: string) =>
      key === 'dateFormat:tz' ? 'America/New_York' : 'MMM D, YYYY @ HH:mm:ss.SSS'
    );
    core.application.capabilities = {
      ...core.application.capabilities,
      advancedSettings: { save: true },
    };

    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
      />
    );

    expect(lastPickerProps?.timeZone).toBe('America/New_York');
    expect(lastPickerProps?.dateFormat).toBe('MMM D, YYYY @ HH:mm:ss.SSS');
    expect(lastPickerProps?.canAccessAdvancedSettings).toBe(true);
    expect(lastPickerProps?.prependBasePath).toBe(core.http.basePath.prepend);
  });

  it('defaults presets persistence to enabled', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
      />
    );

    expect(mockUseDateRangePickerPresets).toHaveBeenCalledWith(
      expect.objectContaining({ persistenceEnabled: true })
    );
  });

  it('honors persistPresets={false}', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        persistPresets={false}
      />
    );

    expect(mockUseDateRangePickerPresets).toHaveBeenCalledWith(
      expect.objectContaining({ persistenceEnabled: false })
    );
  });
});
