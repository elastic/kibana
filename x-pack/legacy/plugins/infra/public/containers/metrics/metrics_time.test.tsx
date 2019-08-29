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
  });
});
