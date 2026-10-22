/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

import { DateRangePicker } from '@kbn/date-range-picker';

import type { UI_SETTINGS } from '@kbn/data-plugin/common';

import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

import { DatePickerWrapper } from './date_picker_wrapper';
import { useRefreshIntervalUpdates } from '../..';

jest.mock('@elastic/eui', () => {
  const EuiButtonMock = jest.fn(() => {
    return null;
  });
  const EuiSuperUpdateButtonMock = jest.fn(() => {
    return null;
  });
  const EuiFlexGroupMock = jest.fn(({ children }: PropsWithChildren<unknown>) => {
    return <>{children}</>;
  });
  const EuiFlexItemMock = jest.fn(({ children }: PropsWithChildren<unknown>) => {
    return <>{children}</>;
  });
  return {
    EuiButton: EuiButtonMock,
    EuiSuperUpdateButton: EuiSuperUpdateButtonMock,
    EuiFlexGroup: EuiFlexGroupMock,
    EuiFlexItem: EuiFlexItemMock,
  };
});

jest.mock('@kbn/date-range-picker', () => ({
  DateRangePicker: jest.fn(() => null),
}));

jest.mock('@kbn/date-range-picker-presets', () => ({
  useDateRangePickerPresets: jest.fn(() => ({ presets: [] })),
}));

jest.mock('@kbn/ml-url-state', () => {
  return {
    useUrlState: jest.fn(() => {
      return [{ refreshInterval: { value: 0, pause: true } }, jest.fn()];
    }),
  };
});

jest.mock('../hooks/use_timefilter', () => ({
  useRefreshIntervalUpdates: jest.fn(() => {
    return {
      pause: false,
    };
  }),

  useTimefilter: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { of } = require('rxjs');
    return {
      getRefreshIntervalUpdate$: of(),
    };
  },
  useTimeRangeUpdates: jest.fn(() => {
    return { from: '', to: '' };
  }),
}));

jest.mock('../hooks/use_date_picker_context', () => ({
  useDatePickerContext: jest.fn(),
}));

const mockContextFactory = (addWarning: jest.Mock<void, []>) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  const mockedUiSettingsKeys = {} as typeof UI_SETTINGS;
  const mockedI18n = jest.fn();

  // Build the context once so its services keep stable references across renders, like in the app.
  const context = {
    notifications: {
      toasts: { addWarning },
    },
    http: { basePath: { prepend: jest.fn((path: string) => path) } },
    uiSettings: {
      get: jest.fn().mockReturnValue([
        {
          from: 'now/d',
          to: 'now/d',
          display: 'Today',
        },
        {
          from: 'now/w',
          to: 'now/w',
          display: 'This week',
        },
      ]),
    },
    data: {
      query: {
        timefilter: {
          timefilter: {
            getRefreshInterval: jest.fn(),
            setRefreshInterval: jest.fn(),
            getTime: jest.fn(() => {
              return { from: '', to: '' };
            }),
            isAutoRefreshSelectorEnabled: jest.fn(() => true),
            isTimeRangeSelectorEnabled: jest.fn(() => true),
            getRefreshIntervalUpdate$: jest.fn(),
            getTimeUpdate$: jest.fn(),
            getEnabledUpdated$: jest.fn(),
          },
          history: { get: jest.fn(() => []), get$: jest.fn(() => of([])) },
        },
      },
      dateRangePickerPresets: {},
    },
    theme: {
      theme$: of(),
    },
    uiSettingsKeys: mockedUiSettingsKeys,
    i18n: mockedI18n,
  };

  return () => context;
};

const MockedDateRangePicker = DateRangePicker as jest.MockedFunction<typeof DateRangePicker>;

describe('<DatePickerWrapper />', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    MockedDateRangePicker.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Minimal initialization.', async () => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    const displayWarningSpy = jest.fn(() => {});

    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    render(<DatePickerWrapper />);

    expect(refreshListener).toHaveBeenCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  test('should set interval to default of 5s when pause is disabled and refresh interval is 0', () => {
    // arrange
    (useRefreshIntervalUpdates as jest.Mock).mockReturnValue({ pause: false, value: 0 });

    const displayWarningSpy = jest.fn(() => {});

    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    // act
    render(<DatePickerWrapper />);

    // assert
    // Show warning that the interval set is too short
    expect(displayWarningSpy).toHaveBeenCalled();
    const { autoRefresh } = MockedDateRangePicker.mock.calls[0][0].settings;
    expect(autoRefresh?.isPaused).toBe(false);
    expect(autoRefresh?.intervalMs).toBe(5000);
  });

  test('should show a warning when configured interval is too short', () => {
    // arrange
    (useRefreshIntervalUpdates as jest.Mock).mockReturnValue({ pause: false, value: 10 });

    const displayWarningSpy = jest.fn(() => {});

    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    // act
    render(<DatePickerWrapper />);

    // assert
    expect(displayWarningSpy).toHaveBeenCalled();
    const { autoRefresh } = MockedDateRangePicker.mock.calls[0][0].settings;
    expect(autoRefresh?.isPaused).toBe(false);
    expect(autoRefresh?.intervalMs).toBe(10);
  });

  test('should pass the running refresh interval to the picker auto-refresh settings', () => {
    (useRefreshIntervalUpdates as jest.Mock).mockReturnValue({ pause: false, value: 10000 });
    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(jest.fn()));

    render(<DatePickerWrapper />);

    const calledWith = MockedDateRangePicker.mock.calls[0][0];
    expect(calledWith.settings.autoRefresh).toEqual({
      isEnabled: true,
      isPaused: false,
      intervalMs: 10000,
      intervalDisplayUnit: 's',
    });
  });

  test('should trigger a refresh when the picker auto-refresh fires', () => {
    const refreshListener = jest.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);
    (useRefreshIntervalUpdates as jest.Mock).mockReturnValue({ pause: false, value: 10000 });
    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(jest.fn()));

    render(<DatePickerWrapper />);
    MockedDateRangePicker.mock.calls[0][0].onRefresh?.();

    expect(refreshListener).toHaveBeenCalledTimes(1);
    refreshSubscription.unsubscribe();
  });
});
