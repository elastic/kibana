/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountHook } from 'test_utils/enzyme_helpers';

import { useMetricsTime } from './with_metrics_time';

describe('useMetricsTime hook', () => {
  describe('timeRange state', () => {
    it('has a default value', () => {
      const { getLastHookValue } = mountHook(() => useMetricsTime().timeRange);
      const hookValue = getLastHookValue();
      expect(hookValue).toHaveProperty('from');
      expect(hookValue).toHaveProperty('to');
      expect(hookValue.interval).toBe('>=1m');
    });

    it('can be updated', () => {
      const { act, getLastHookValue } = mountHook(() => useMetricsTime());

      const timeRange = {
        from: 'now-15m',
        to: 'now',
        interval: '>=2m',
      };

      act(({ setTimeRange }) => {
        setTimeRange(timeRange);
      });

      expect(getLastHookValue().timeRange).toEqual(timeRange);
    });
  });

  describe('AutoReloading state', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('has a default value', () => {
      const { getLastHookValue } = mountHook(() => useMetricsTime().isAutoReloading);
      expect(getLastHookValue()).toBe(false);
    });

    it('can be updated', () => {
      const { act, getLastHookValue } = mountHook(() => useMetricsTime());

      act(({ setAutoReload }) => {
        setAutoReload(true);
      });

      expect(getLastHookValue().isAutoReloading).toBe(true);
    });

    it('sets up an interval when turned on', () => {
      const { act } = mountHook(() => useMetricsTime());
      const refreshInterval = 10000;

      act(({ setAutoReload, setRefreshInterval }) => {
        setRefreshInterval(refreshInterval);
        setAutoReload(true);
        jest.runOnlyPendingTimers();
      });

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), refreshInterval);
    });
  });
});
