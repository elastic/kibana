/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { EuiSuperDatePicker } from '@elastic/eui';

import { useUrlState } from '@kbn/ml-url-state';
import type { UI_SETTINGS } from '@kbn/data-plugin/common';

import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';

import { DatePickerWrapper } from './date_picker_wrapper';

jest.mock('@elastic/eui', () => {
  const EuiButtonMock = jest.fn(() => {
    return null;
  });
  const EuiSuperDatePickerMock = jest.fn(() => {
    return null;
  });
  const EuiFlexGroupMock = jest.fn(({ children }) => {
    return <>{children}</>;
  });
  const EuiFlexItemMock = jest.fn(({ children }) => {
    return <>{children}</>;
  });
  return {
    useEuiBreakpoint: jest.fn(() => 'mediaQuery @media only screen and (max-width: 1199px)'),
    useIsWithinMaxBreakpoint: jest.fn(() => false),
    EuiButton: EuiButtonMock,
    EuiSuperDatePicker: EuiSuperDatePickerMock,
    EuiFlexGroup: EuiFlexGroupMock,
    EuiFlexItem: EuiFlexItemMock,
  };
});

jest.mock('@kbn/ml-url-state', () => {
  return {
    useUrlState: jest.fn(() => {
      return [{ refreshInterval: { value: 0, pause: true } }, jest.fn()];
    }),
  };
});

jest.mock('../hooks/use_timefilter', () => ({
  useRefreshIntervalUpdates: jest.fn(),
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
  const mockedToMountPoint = jest.fn();
  const mockedWrapWithTheme = jest.fn();

  return () => ({
    notifications: {
      toasts: { addWarning },
    },
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
          history: { get: jest.fn() },
        },
      },
    },
    theme: {
      theme$: of(),
    },
    uiSettingsKeys: mockedUiSettingsKeys,
    toMountPoint: mockedToMountPoint,
    wrapWithTheme: mockedWrapWithTheme,
  });
};

const MockedEuiSuperDatePicker = EuiSuperDatePicker as jest.MockedFunction<
  typeof EuiSuperDatePicker
>;

describe('<DatePickerWrapper />', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    MockedEuiSuperDatePicker.mockClear();
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

    expect(refreshListener).toBeCalledTimes(0);

    refreshSubscription.unsubscribe();
  });

  test('should set interval to default of 5s when pause is disabled and refresh interval is 0', () => {
    // arrange
    (useUrlState as jest.Mock).mockReturnValue([{ refreshInterval: { pause: false, value: 0 } }]);

    const displayWarningSpy = jest.fn(() => {});

    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(displayWarningSpy));

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
    (useUrlState as jest.Mock).mockReturnValue([{ refreshInterval: { pause: false, value: 10 } }]);

    const displayWarningSpy = jest.fn(() => {});

    (useDatePickerContext as jest.Mock).mockImplementation(mockContextFactory(displayWarningSpy));

    // act
    render(<DatePickerWrapper />);

    // assert
    expect(displayWarningSpy).toHaveBeenCalled();
    const calledWith = MockedEuiSuperDatePicker.mock.calls[0][0];
    expect(calledWith.isPaused).toBe(false);
    expect(calledWith.refreshInterval).toBe(10);
  });
});
