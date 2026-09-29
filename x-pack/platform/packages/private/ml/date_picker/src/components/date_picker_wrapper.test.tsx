/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

import { EuiSuperDatePicker } from '@elastic/eui';

import type { UI_SETTINGS } from '@kbn/data-plugin/common';

import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

import { DatePickerWrapper } from './date_picker_wrapper';
import { useRefreshIntervalUpdates } from '../..';

vi.mock('@elastic/eui', () => {
  const EuiButtonMock = vi.fn(() => {
    return null;
  });
  const EuiSuperDatePickerMock = vi.fn(() => {
    return null;
  });
  const EuiFlexGroupMock = vi.fn(({ children }: PropsWithChildren<unknown>) => {
    return <>{children}</>;
  });
  const EuiFlexItemMock = vi.fn(({ children }: PropsWithChildren<unknown>) => {
    return <>{children}</>;
  });
  return {
    useEuiBreakpoint: vi.fn(() => 'mediaQuery @media only screen and (max-width: 1199px)'),
    useIsWithinMaxBreakpoint: vi.fn(() => false),
    EuiButton: EuiButtonMock,
    EuiSuperDatePicker: EuiSuperDatePickerMock,
    EuiFlexGroup: EuiFlexGroupMock,
    EuiFlexItem: EuiFlexItemMock,
  };
});

vi.mock('@kbn/ml-url-state', () => {
  return {
    useUrlState: vi.fn(() => {
      return [{ refreshInterval: { value: 0, pause: true } }, vi.fn()];
    }),
  };
});

vi.mock('../hooks/use_timefilter', () => {
  const mocked = {
    useRefreshIntervalUpdates: vi.fn(() => {
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
    useTimeRangeUpdates: vi.fn(() => {
      return { from: '', to: '' };
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_date_picker_context', () => {
  const mocked = {
    useDatePickerContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockContextFactory = (addWarning: Mock<(...args: []) => void>) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  const mockedUiSettingsKeys = {} as typeof UI_SETTINGS;
  const mockedI18n = vi.fn();

  return () => ({
    notifications: {
      toasts: { addWarning },
    },
    uiSettings: {
      get: vi.fn().mockReturnValue([
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
            getRefreshInterval: vi.fn(),
            setRefreshInterval: vi.fn(),
            getTime: vi.fn(() => {
              return { from: '', to: '' };
            }),
            isAutoRefreshSelectorEnabled: vi.fn(() => true),
            isTimeRangeSelectorEnabled: vi.fn(() => true),
            getRefreshIntervalUpdate$: vi.fn(),
            getTimeUpdate$: vi.fn(),
            getEnabledUpdated$: vi.fn(),
          },
          history: { get: vi.fn() },
        },
      },
    },
    theme: {
      theme$: of(),
    },
    uiSettingsKeys: mockedUiSettingsKeys,
    i18n: mockedI18n,
  });
};

const MockedEuiSuperDatePicker = EuiSuperDatePicker as MockedFunction<typeof EuiSuperDatePicker>;

describe('<DatePickerWrapper />', () => {
  beforeEach(() => {
    vi.useFakeTimers({ legacyFakeTimers: true });
    MockedEuiSuperDatePicker.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('Minimal initialization.', async () => {
    const refreshListener = vi.fn();
    const refreshSubscription = mlTimefilterRefresh$.subscribe(refreshListener);

    const displayWarningSpy = vi.fn(() => {});

    (useDatePickerContext as Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    render(<DatePickerWrapper />);

    expect(refreshListener).toHaveBeenCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  test('should set interval to default of 5s when pause is disabled and refresh interval is 0', () => {
    // arrange
    (useRefreshIntervalUpdates as Mock).mockReturnValue({ pause: false, value: 0 });

    const displayWarningSpy = vi.fn(() => {});

    (useDatePickerContext as Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    // act
    render(<DatePickerWrapper />);

    // assert
    // Show warning that the interval set is too short
    expect(displayWarningSpy).toHaveBeenCalled();
    const calledWith = MockedEuiSuperDatePicker.mock.calls[0][0];
    expect(calledWith.isPaused).toBe(false);
    expect(calledWith.refreshInterval).toBe(5000);
  });

  test('should show a warning when configured interval is too short', () => {
    // arrange
    (useRefreshIntervalUpdates as Mock).mockReturnValue({ pause: false, value: 10 });

    const displayWarningSpy = vi.fn(() => {});

    (useDatePickerContext as Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    // act
    render(<DatePickerWrapper />);

    // assert
    expect(displayWarningSpy).toHaveBeenCalled();
    const calledWith = MockedEuiSuperDatePicker.mock.calls[0][0];
    expect(calledWith.isPaused).toBe(false);
    expect(calledWith.refreshInterval).toBe(10);
  });
});
