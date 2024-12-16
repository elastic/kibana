/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDatePickerContext } from './use_date_picker_context';
import { useTimefilter } from './use_timefilter';

jest.mock('./use_date_picker_context');

const mockContextFactory = (
  isAutoRefreshSelectorEnabled: boolean = true,
  isTimeRangeSelectorEnabled: boolean = true
) => ({
  data: {
    query: {
      timefilter: {
        timefilter: {
          disableTimeRangeSelector: jest.fn(),
          disableAutoRefreshSelector: jest.fn(),
          enableTimeRangeSelector: jest.fn(),
          enableAutoRefreshSelector: jest.fn(),
          isAutoRefreshSelectorEnabled: jest.fn(() => isAutoRefreshSelectorEnabled),
          isTimeRangeSelectorEnabled: jest.fn(() => isTimeRangeSelectorEnabled),
        },
      },
    },
  },
});

describe('useTimefilter', () => {
  test('will not trigger any date picker settings by default', () => {
    (useDatePickerContext as jest.Mock).mockReturnValueOnce(mockContextFactory());

    const { result } = renderHook(() => useTimefilter());
    const timefilter = result.current;

    expect(timefilter.disableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.disableAutoRefreshSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
  });

  test('custom disabled overrides', () => {
    (useDatePickerContext as jest.Mock).mockReturnValueOnce(mockContextFactory());

    const { result } = renderHook(() =>
      useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false })
    );
    const timefilter = result.current;

    expect(timefilter.disableTimeRangeSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.disableAutoRefreshSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
  });

  test('custom enabled overrides', () => {
    (useDatePickerContext as jest.Mock).mockReturnValueOnce(mockContextFactory(false, false));

    const { result } = renderHook(() =>
      useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true })
    );
    const timefilter = result.current;

    expect(timefilter.disableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.disableAutoRefreshSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(1);
  });
});
