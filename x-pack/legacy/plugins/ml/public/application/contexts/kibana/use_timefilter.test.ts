/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useTimefilter } from './use_timefilter';

jest.mock('./kibana_context', () => ({
  useMlKibana: () => {
    return {
      services: {
        data: {
          query: {
            timefilter: {
              timefilter: {
                disableTimeRangeSelector: jest.fn(),
                disableAutoRefreshSelector: jest.fn(),
                enableTimeRangeSelector: jest.fn(),
                enableAutoRefreshSelector: jest.fn(),
              },
            },
          },
        },
      },
    };
  },
}));

describe('useTimefilter', () => {
  test('defaults to enabled time range selector and auto refresh', () => {
    const { result } = renderHook(() => useTimefilter());
    const timefilter = result.current;

    expect(timefilter.disableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.disableAutoRefreshSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(1);
  });

  test('custom overrides', () => {
    const { result } = renderHook(() =>
      useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false })
    );
    const timefilter = result.current;

    expect(timefilter.disableTimeRangeSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.disableAutoRefreshSelector).toHaveBeenCalledTimes(1);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
    expect(timefilter.enableTimeRangeSelector).toHaveBeenCalledTimes(0);
  });
});
