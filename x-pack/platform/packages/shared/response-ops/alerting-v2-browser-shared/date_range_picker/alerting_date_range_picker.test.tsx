/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  DATE_RANGE_PICKER_FEATURE_FLAG,
  type DateRangePickerOnChangeProps,
  type DateRangePickerProps,
} from '@kbn/date-range-picker';
import { AlertingDateRangePicker } from './alerting_date_range_picker';
import type { AlertingDateRangePickerServices } from './alerting_date_range_picker';

const mockOnChange = jest.fn();
let lastPickerProps: DateRangePickerProps | undefined;
let useNewDateRangePickerFlag = true;
const mockSuperDatePicker = jest.fn(
  (props: { 'data-test-subj'?: string; start?: string; end?: string }) => (
    <div data-test-subj={props['data-test-subj'] ?? 'mockSuperDatePicker'} />
  )
);

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiSuperDatePicker: (props: { 'data-test-subj'?: string }) => mockSuperDatePicker(props),
  };
});

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: (props: DateRangePickerProps) => {
    lastPickerProps = props;
    return <div data-test-subj={props['data-test-subj'] ?? 'mockDateRangePicker'} />;
  },
}));

const mockUseDateRangePickerPresets = jest.fn((_options?: unknown) => ({
  presets: [{ start: 'now-15m', end: 'now', label: 'Last 15 minutes' }],
  onPresetSave: jest.fn(),
  onPresetDelete: jest.fn(),
}));

jest.mock('@kbn/date-range-picker-presets', () => ({
  useDateRangePickerPresets: (options: unknown) => mockUseDateRangePickerPresets(options),
}));

const data = dataPluginMock.createStartContract();
const core = coreMock.createStart();
const services: AlertingDateRangePickerServices = {
  data,
  notifications: core.notifications,
  http: core.http,
  application: core.application,
  uiSettings: core.uiSettings,
  featureFlags: core.featureFlags,
};

describe('AlertingDateRangePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastPickerProps = undefined;
    mockOnChange.mockClear();
    useNewDateRangePickerFlag = true;
    (data.query.timefilter.history.get as jest.Mock).mockReturnValue([]);
    (core.featureFlags.getBooleanValue as jest.Mock).mockImplementation(
      (key: string, fallback: boolean) => {
        if (key === DATE_RANGE_PICKER_FEATURE_FLAG) {
          return useNewDateRangePickerFlag;
        }
        return fallback;
      }
    );
    (core.featureFlags.getBooleanValue$ as jest.Mock).mockImplementation(
      (key: string, fallback: boolean) => {
        if (key === DATE_RANGE_PICKER_FEATURE_FLAG) {
          return new BehaviorSubject(useNewDateRangePickerFlag);
        }
        return of(fallback);
      }
    );
  });

  it('marks the picker invalid and ignores invalid onChange commits', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
      />
    );

    expect(lastPickerProps).toBeDefined();
    expect(lastPickerProps?.isInvalid).toBe(false);

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
    expect(lastPickerProps?.isInvalid).toBe(true);
  });

  it('clears invalid state when the input changes', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
      />
    );

    act(() => {
      lastPickerProps!.onChange({
        start: 'bad',
        end: 'worse',
        startDate: null,
        endDate: null,
        value: 'bad',
        isInvalid: true,
      });
    });
    expect(lastPickerProps?.isInvalid).toBe(true);

    act(() => {
      lastPickerProps!.onInputChange?.('still typing');
    });
    expect(lastPickerProps?.isInvalid).toBe(false);
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
    expect(lastPickerProps?.inputDateFormats).toEqual(['MMM D, YYYY @ HH:mm:ss.SSS']);
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

  it('omits the manual refresh button when onRefresh is absent', () => {
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        data-test-subj="alertingDateRangePicker"
      />
    );

    expect(screen.queryByTestId('alertingDateRangePicker-refresh')).not.toBeInTheDocument();
  });

  it('renders a manual refresh button that calls onRefresh when clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = jest.fn();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        onRefresh={onRefresh}
        data-test-subj="alertingDateRangePicker"
      />
    );

    const refreshButton = screen.getByTestId('alertingDateRangePicker-refresh');
    await user.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows a loading spinner on the manual refresh button while isLoading', () => {
    const onRefresh = jest.fn();
    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        onRefresh={onRefresh}
        isLoading
        data-test-subj="alertingDateRangePicker"
      />
    );

    const refreshButton = screen.getByTestId('alertingDateRangePicker-refresh');
    expect(refreshButton).toHaveAttribute('disabled');
  });

  it('shows the EuiSuperDatePicker update button only when onRefresh is provided (feature flag off)', () => {
    useNewDateRangePickerFlag = false;
    const onRefresh = jest.fn();

    const { rerender } = render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        data-test-subj="alertingDateRangePicker"
      />
    );

    expect(mockSuperDatePicker).toHaveBeenLastCalledWith(
      expect.objectContaining({ showUpdateButton: false })
    );

    rerender(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        onRefresh={onRefresh}
        data-test-subj="alertingDateRangePicker"
      />
    );

    expect(mockSuperDatePicker).toHaveBeenLastCalledWith(
      expect.objectContaining({ showUpdateButton: 'iconOnly' })
    );
  });

  it('falls back to EuiSuperDatePicker when the feature flag is disabled', () => {
    useNewDateRangePickerFlag = false;

    render(
      <AlertingDateRangePicker
        from="now-15m"
        to="now"
        onChange={mockOnChange}
        services={services}
        data-test-subj="alertingDateRangePicker"
      />
    );

    expect(screen.getByTestId('alertingDateRangePicker')).toBeInTheDocument();
    expect(lastPickerProps).toBeUndefined();
    expect(mockSuperDatePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        start: 'now-15m',
        end: 'now',
        'data-test-subj': 'alertingDateRangePicker',
      })
    );
  });
});
