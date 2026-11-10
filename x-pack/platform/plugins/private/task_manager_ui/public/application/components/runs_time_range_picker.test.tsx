/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { act, render, screen } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { DateRangePickerProps } from '@kbn/date-range-picker';
import { TaskManagerUiApi } from '../../lib/api';
import { TaskManagerUiAppContextProvider } from '../app_context';
import { createAppServicesMock } from '../test_utils';
import { RunsTimeRangePicker } from './runs_time_range_picker';

let mockPickerProps: DateRangePickerProps | undefined;

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: (props: DateRangePickerProps) => {
    mockPickerProps = props;
    return <div data-test-subj={props['data-test-subj']} />;
  },
}));

const UI_SETTINGS: Record<string, string> = {
  'dateFormat:tz': 'Europe/London',
  'dateFormat:dow': 'Monday',
  dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
};

const pick = ({
  start,
  end,
  isInvalid = false,
}: {
  start: string;
  end: string;
  isInvalid?: boolean;
}) =>
  act(() =>
    mockPickerProps?.onChange({
      start,
      end,
      startDate: null,
      endDate: null,
      value: `${start} to ${end}`,
      isInvalid,
    })
  );

describe('RunsTimeRangePicker', () => {
  const onChange = jest.fn();
  let services: ReturnType<typeof createAppServicesMock>;

  const renderPicker = (timeRange = { start: 'now-24h', end: 'now' }) =>
    render(
      <TaskManagerUiAppContextProvider
        api={new TaskManagerUiApi(httpServiceMock.createStartContract())}
        {...services}
      >
        <RunsTimeRangePicker timeRange={timeRange} onChange={onChange} />
      </TaskManagerUiAppContextProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockPickerProps = undefined;
    services = createAppServicesMock();
    services.uiSettings.get.mockImplementation((key: string) => UI_SETTINGS[key]);
  });

  it('shows the time range with the Kibana date settings', () => {
    renderPicker();

    expect(mockPickerProps).toMatchObject({
      value: 'now-24h to now',
      timeZone: 'Europe/London',
      calendarOptions: { firstDayOfWeek: 1 },
      inputDateFormats: ['MMM D, YYYY @ HH:mm:ss.SSS'],
    });
  });

  it('offers the shared presets and recent time ranges, without those longer than 30 days', () => {
    jest.mocked(services.data.dateRangePickerPresets.getPresets$).mockReturnValue(
      of([
        { start: 'now-7d', end: 'now', label: 'Last 7 days' },
        { start: 'now-1y', end: 'now', label: 'Last 1 year' },
      ])
    );
    jest.mocked(services.data.query.timefilter.history.get).mockReturnValue([
      { from: 'now-90d', to: 'now' },
      { from: 'now-15m', to: 'now' },
    ]);

    renderPicker();

    expect(mockPickerProps?.presets).toEqual([
      { start: 'now-7d', end: 'now', label: 'Last 7 days' },
    ]);
    expect(mockPickerProps?.recent).toEqual([{ start: 'now-15m', end: 'now' }]);
  });

  it('applies a valid time range and adds it to the recent time ranges', async () => {
    renderPicker();

    await pick({ start: 'now-7d', end: 'now' });

    expect(onChange).toHaveBeenCalledWith({ start: 'now-7d', end: 'now' });
    expect(services.data.query.timefilter.history.add).toHaveBeenCalledWith({
      from: 'now-7d',
      to: 'now',
    });
    expect(mockPickerProps?.isInvalid).toBe(false);
  });

  it('shows a time range applied from outside in place of a rejected input', async () => {
    const { rerender } = renderPicker();
    await pick({ start: 'now-90d', end: 'now' });
    expect(mockPickerProps).toMatchObject({ value: 'now-90d to now', isInvalid: true });

    rerender(
      <TaskManagerUiAppContextProvider
        api={new TaskManagerUiApi(httpServiceMock.createStartContract())}
        {...services}
      >
        <RunsTimeRangePicker timeRange={{ start: 'now-7d', end: 'now' }} onChange={onChange} />
      </TaskManagerUiAppContextProvider>
    );

    expect(mockPickerProps).toMatchObject({ value: 'now-7d to now', isInvalid: false });
    expect(screen.queryByTestId('taskManagerUiTimeRangeError')).not.toBeInTheDocument();
  });

  it('rejects a time range longer than 30 days with an error', async () => {
    renderPicker();

    await pick({ start: 'now-90d', end: 'now' });

    expect(onChange).not.toHaveBeenCalled();
    expect(services.data.query.timefilter.history.add).not.toHaveBeenCalled();
    expect(mockPickerProps?.isInvalid).toBe(true);
    expect(screen.getByTestId('taskManagerUiTimeRangeError')).toHaveTextContent(
      'Select a time range of 30 days or less.'
    );

    await act(() => mockPickerProps?.onInputChange?.('now-7d'));

    expect(mockPickerProps?.isInvalid).toBe(false);
    expect(screen.queryByTestId('taskManagerUiTimeRangeError')).not.toBeInTheDocument();
  });

  it('ignores a time range the picker cannot parse', async () => {
    renderPicker();

    await pick({ start: 'soon', end: 'later', isInvalid: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPickerProps?.isInvalid).toBe(true);
    expect(screen.queryByTestId('taskManagerUiTimeRangeError')).not.toBeInTheDocument();
  });
});
