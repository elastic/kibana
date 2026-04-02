/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { BehaviorSubject, NEVER, Subject } from 'rxjs';

import type { OpsMetrics } from '@kbn/core/server';

import {
  CLAIM_STRATEGY_UPDATE_BY_QUERY,
  DEFAULT_DYNAMIC_CAPACITY,
  type TaskManagerConfig,
  configSchema,
} from '../config';
import { mockLogger } from '../test_utils';
import { ADJUST_THROUGHPUT_INTERVAL, countErrors } from './create_managed_configuration';
import {
  areProcessSignalsHealthy,
  createTaskManagerCapacityConfiguration$,
  getTaskManagerRecoveryCeiling,
} from './capacity_configuration_stream';

const mockCpuInfo = (): os.CpuInfo => ({
  model: 'mock',
  speed: 0,
  times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
});

const healthyMetrics: OpsMetrics = {
  collected_at: new Date(),
  elasticsearch_client: {
    totalActiveSockets: 0,
    totalIdleSockets: 0,
    totalQueuedRequests: 0,
  },
  process: {
    pid: 1,
    uptime_in_millis: 1,
    memory: {
      heap: { total_in_bytes: 200, used_in_bytes: 40, size_limit: 1000 },
      resident_set_size_in_bytes: 1,
      external_in_bytes: 1,
      array_buffers_in_bytes: 1,
    },
    event_loop_delay: 1,
    event_loop_delay_histogram: {} as OpsMetrics['process']['event_loop_delay_histogram'],
    event_loop_utilization: { active: 1, idle: 9, utilization: 0.1 },
  },
  processes: [],
  os: {
    platform: 'linux',
    platformRelease: 'test',
    load: { '1m': 0.2, '5m': 0.2, '15m': 0.2 },
    memory: { total_in_bytes: 1, free_in_bytes: 1, used_in_bytes: 1 },
    uptime_in_millis: 1,
  },
  response_times: { avg_in_millis: 1, max_in_millis: 1 },
  requests: { disconnects: 0, total: 0, statusCodes: {} },
  concurrent_connections: 0,
};

describe('capacity_configuration_stream', () => {
  const logger = mockLogger();
  let cpusSpy: jest.SpyInstance;

  beforeEach(() => {
    cpusSpy = jest
      .spyOn(os, 'cpus')
      .mockReturnValue([mockCpuInfo(), mockCpuInfo(), mockCpuInfo(), mockCpuInfo()]);
  });

  afterEach(() => {
    cpusSpy.mockRestore();
  });

  describe('getTaskManagerRecoveryCeiling', () => {
    it('returns starting capacity when dynamic scaling is disabled', () => {
      const config = {
        dynamic_capacity: { ...DEFAULT_DYNAMIC_CAPACITY, enabled: false },
      } as TaskManagerConfig;
      expect(getTaskManagerRecoveryCeiling(config, 10)).toBe(10);
    });

    it('returns max(starting, upper_bound) when enabled', () => {
      const config = {
        dynamic_capacity: { ...DEFAULT_DYNAMIC_CAPACITY, enabled: true, upper_bound: 40 },
      } as TaskManagerConfig;
      expect(getTaskManagerRecoveryCeiling(config, 10)).toBe(40);
      expect(getTaskManagerRecoveryCeiling(config, 45)).toBe(45);
    });
  });

  describe('areProcessSignalsHealthy', () => {
    it('returns true when metrics are within thresholds', () => {
      expect(areProcessSignalsHealthy(healthyMetrics, DEFAULT_DYNAMIC_CAPACITY)).toBe(true);
    });

    it('returns false when event loop utilization is too high', () => {
      const metrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          event_loop_utilization: { active: 9, idle: 1, utilization: 0.95 },
        },
      };
      expect(areProcessSignalsHealthy(metrics, DEFAULT_DYNAMIC_CAPACITY)).toBe(false);
    });

    it('returns false when heap usage fraction is too high', () => {
      const metrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          memory: {
            ...healthyMetrics.process.memory,
            heap: { total_in_bytes: 100, used_in_bytes: 900, size_limit: 1000 },
          },
        },
      };
      expect(areProcessSignalsHealthy(metrics, DEFAULT_DYNAMIC_CAPACITY)).toBe(false);
    });

    it('returns false when event loop delay exceeds max_event_loop_delay_ms', () => {
      const metrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          event_loop_delay: 50_000,
        },
      };
      expect(areProcessSignalsHealthy(metrics, DEFAULT_DYNAMIC_CAPACITY)).toBe(false);
    });

    it('ignores event loop delay when max_event_loop_delay_ms is 0', () => {
      const metrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          event_loop_delay: 50_000,
        },
      };
      expect(
        areProcessSignalsHealthy(metrics, {
          ...DEFAULT_DYNAMIC_CAPACITY,
          max_event_loop_delay_ms: 0,
        })
      ).toBe(true);
    });
  });

  describe('createTaskManagerCapacityConfiguration$', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('increments capacity when dynamic_capacity is enabled and scale interval elapses', () => {
      const errors$ = new Subject<Error>();
      const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
      const metrics$ = new BehaviorSubject(healthyMetrics);

      const config = configSchema.validate({
        capacity: 10,
        poll_interval: 3000,
        claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        monitored_stats_required_freshness: 4000,
        dynamic_capacity: {
          enabled: true,
          upper_bound: 12,
          scale_interval_ms: 5000,
          scale_up_step: 1,
        },
      });

      const recoveryCeiling = getTaskManagerRecoveryCeiling(config, 10);

      const postClaimUtilizationPct$ = new BehaviorSubject(100);

      const values: number[] = [];
      const subscription = createTaskManagerCapacityConfiguration$({
        errorCheck$,
        config,
        logger,
        startingCapacity: 10,
        recoveryCeiling,
        opsMetrics$: metrics$,
        postClaimUtilizationPct$,
      }).subscribe((c) => values.push(c));

      // Synthetic error flush (count 0) first bumps 10 -> 11 toward recovery ceiling.
      expect(values[values.length - 1]).toBe(11);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(12);

      subscription.unsubscribe();
      errors$.complete();
    });

    it('does not change capacity from ES error window when adjust_capacity_for_elasticsearch_errors is false', () => {
      const errors$ = new Subject<Error>();
      const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
      const metrics$ = new BehaviorSubject(healthyMetrics);
      const postClaimUtilizationPct$ = new BehaviorSubject(100);

      const config = configSchema.validate({
        adjust_capacity_for_elasticsearch_errors: false,
        capacity: 10,
        poll_interval: 3000,
        claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        monitored_stats_required_freshness: 4000,
        dynamic_capacity: {
          enabled: true,
          upper_bound: 12,
          scale_interval_ms: 5000,
          scale_up_step: 1,
        },
      });

      const recoveryCeiling = getTaskManagerRecoveryCeiling(config, 10);

      const values: number[] = [];
      const subscription = createTaskManagerCapacityConfiguration$({
        errorCheck$,
        config,
        logger,
        startingCapacity: 10,
        recoveryCeiling,
        opsMetrics$: metrics$,
        postClaimUtilizationPct$,
      }).subscribe((c) => values.push(c));

      expect(values[values.length - 1]).toBe(10);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(11);

      subscription.unsubscribe();
      errors$.complete();
    });

    it('does not increment capacity when post-claim utilization is below the minimum', () => {
      const errors$ = new Subject<Error>();
      const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
      const metrics$ = new BehaviorSubject(healthyMetrics);
      const postClaimUtilizationPct$ = new BehaviorSubject(25);

      const config = configSchema.validate({
        capacity: 10,
        poll_interval: 3000,
        claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        monitored_stats_required_freshness: 4000,
        dynamic_capacity: {
          enabled: true,
          upper_bound: 12,
          scale_interval_ms: 5000,
          scale_up_step: 1,
          scale_up_min_post_claim_utilization_pct: 100,
        },
      });

      const recoveryCeiling = getTaskManagerRecoveryCeiling(config, 10);

      const values: number[] = [];
      const subscription = createTaskManagerCapacityConfiguration$({
        errorCheck$,
        config,
        logger,
        startingCapacity: 10,
        recoveryCeiling,
        opsMetrics$: metrics$,
        postClaimUtilizationPct$,
      }).subscribe((c) => values.push(c));

      expect(values[values.length - 1]).toBe(11);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(11);

      subscription.unsubscribe();
      errors$.complete();
    });

    it('does not apply ES zero-error recovery toward ceiling while process signals are unhealthy', () => {
      const errorCheck$ = NEVER;
      const unhealthyMetrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          event_loop_utilization: { active: 9, idle: 1, utilization: 0.95 },
        },
      };
      const metrics$ = new BehaviorSubject(unhealthyMetrics);
      const postClaimUtilizationPct$ = new BehaviorSubject(100);

      const config = configSchema.validate({
        capacity: 10,
        poll_interval: 3000,
        claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        monitored_stats_required_freshness: 4000,
        dynamic_capacity: {
          enabled: true,
          upper_bound: 20,
          scale_interval_ms: 5000,
          scale_up_step: 1,
        },
      });

      const recoveryCeiling = getTaskManagerRecoveryCeiling(config, 10);

      const values: number[] = [];
      const subscription = createTaskManagerCapacityConfiguration$({
        errorCheck$,
        config,
        logger,
        startingCapacity: 10,
        recoveryCeiling,
        opsMetrics$: metrics$,
        postClaimUtilizationPct$,
      }).subscribe((c) => values.push(c));

      // Synthetic initial error flush would normally move 10 -> 11; skipped when signals unhealthy.
      expect(values[values.length - 1]).toBe(10);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(10);

      metrics$.next(healthyMetrics);
      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(11);

      subscription.unsubscribe();
    });

    it('decrements capacity when process signals are unhealthy, but not below configured capacity', () => {
      // Avoid countErrors() here: its 10s flush overlaps scale ticks and applies ES recovery
      // (capacity increase on zero errors), which would mask dynamic scale-down.
      const errorCheck$ = NEVER;
      const metrics$ = new BehaviorSubject(healthyMetrics);
      const postClaimUtilizationPct$ = new BehaviorSubject(100);

      const config = configSchema.validate({
        capacity: 10,
        poll_interval: 3000,
        claim_strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
        monitored_stats_required_freshness: 4000,
        dynamic_capacity: {
          enabled: true,
          upper_bound: 14,
          scale_interval_ms: 5000,
          scale_up_step: 1,
          scale_down_step: 1,
        },
      });

      const recoveryCeiling = getTaskManagerRecoveryCeiling(config, 10);

      const values: number[] = [];
      const subscription = createTaskManagerCapacityConfiguration$({
        errorCheck$,
        config,
        logger,
        startingCapacity: 10,
        recoveryCeiling,
        opsMetrics$: metrics$,
        postClaimUtilizationPct$,
      }).subscribe((c) => values.push(c));

      expect(values[values.length - 1]).toBe(11);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(12);

      const unhealthyMetrics: OpsMetrics = {
        ...healthyMetrics,
        process: {
          ...healthyMetrics.process,
          event_loop_utilization: { active: 9, idle: 1, utilization: 0.95 },
        },
      };
      metrics$.next(unhealthyMetrics);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(11);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(10);

      jest.advanceTimersByTime(5000);
      expect(values[values.length - 1]).toBe(10);

      subscription.unsubscribe();
    });
  });
});
