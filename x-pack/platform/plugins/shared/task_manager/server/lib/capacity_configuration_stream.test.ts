/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { OpsMetrics } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import { CLAIM_STRATEGY_MGET } from '../config';
import { mockLogger } from '../test_utils';
import type { ErrorScanResult } from './create_managed_configuration';
import { createCapacityConfigurationStream } from './capacity_configuration_stream';

const logger = mockLogger();

describe('createCapacityConfigurationStream', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('uses only Elasticsearch-managed capacity when capacity is numeric', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(100);
    const updates: number[] = [];
    const stream$ = createCapacityConfigurationStream({
      config: createConfig({ capacity: 10 }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    errorCheck$.next({ count: 1, isBlockException: false });
    errorCheck$.next({ count: 0, isBlockException: false });

    expect(updates).toEqual([10, 8, 9]);
    subscription.unsubscribe();
  });

  test('scales up dynamically when projected full-capacity metrics are healthy', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(100);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({}));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_interval_ms: 1000,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));

    jest.advanceTimersByTime(3000);

    expect(updates).toContain(11);
    expect(updates).toContain(12);
    subscription.unsubscribe();
  });

  test('scales down only after consecutive unhealthy readings and respects cooldown', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(100);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({}));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_interval_ms: 1000,
          scale_down_cooldown_ms: 30000,
          scale_down_consecutive_unhealthy_readings: 2,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    jest.advanceTimersByTime(2000);
    expect(updates[updates.length - 1]).toBe(12);

    opsMetrics$.next(createOpsMetrics({ elu: 0.95 }));
    jest.advanceTimersByTime(1000);
    expect(updates[updates.length - 1]).toBe(12);

    jest.advanceTimersByTime(1000);
    expect(updates[updates.length - 1]).toBe(11);

    opsMetrics$.next(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(5000);
    expect(updates[updates.length - 1]).toBe(11);

    jest.advanceTimersByTime(30000);
    expect(updates[updates.length - 1]).toBe(12);
    subscription.unsubscribe();
  });

  test('skips Elasticsearch recovery increase when process signals are unhealthy', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(0);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({ elu: 0.95 }));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          scale_interval_ms: 1000,
          upper_bound: 12,
          scale_down_consecutive_unhealthy_readings: 10,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    errorCheck$.next({ count: 1, isBlockException: false });
    jest.advanceTimersByTime(1000);
    expect(updates[updates.length - 1]).toBe(8);

    errorCheck$.next({ count: 0, isBlockException: false });
    jest.advanceTimersByTime(1000);
    expect(updates[updates.length - 1]).toBe(8);
    subscription.unsubscribe();
  });

  test('does not require high current utilization to scale up', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(10);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({ elu: 0.1 }));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_interval_ms: 1000,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    jest.advanceTimersByTime(2000);
    expect(updates).toContain(11);
    expect(updates).toContain(12);
    subscription.unsubscribe();
  });

  test('does not scale up when projected full-capacity metrics are unhealthy', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(40);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({ elu: 0.4 }));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_interval_ms: 1000,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    jest.advanceTimersByTime(3000);
    expect(updates).toEqual([10]);
    subscription.unsubscribe();
  });

  test('uses projection utilization stream for projection factor', () => {
    const errorCheck$ = new Subject<ErrorScanResult>();
    const postClaimUtilization$ = new BehaviorSubject<number>(100);
    const projectionUtilization$ = new BehaviorSubject<number>(20);
    const opsMetrics$ = new BehaviorSubject<OpsMetrics>(createOpsMetrics({ elu: 0.3 }));
    const updates: number[] = [];

    const stream$ = createCapacityConfigurationStream({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_interval_ms: 1000,
        },
      }),
      logger,
      startingCapacity: 10,
      errorCheck$,
      postClaimUtilizationPct$: postClaimUtilization$,
      projectionUtilizationPct$: projectionUtilization$,
      opsMetrics$,
    });

    const subscription = stream$.subscribe((value) => updates.push(value));
    jest.advanceTimersByTime(3000);
    expect(updates).toEqual([10]);
    subscription.unsubscribe();
  });
});

function createConfig(
  overrides: Omit<Partial<TaskManagerConfig>, 'dynamic_capacity'> & {
    dynamic_capacity?: Partial<TaskManagerConfig['dynamic_capacity']>;
  }
): TaskManagerConfig {
  const baseConfig = {
    allow_reading_invalid_state: true,
    api_key_type: 'es',
    adjust_capacity_for_elasticsearch_errors: true,
    auto_calculate_default_ech_capacity: false,
    claim_strategy: CLAIM_STRATEGY_MGET,
    discovery: {
      active_nodes_lookback: '30s',
      interval: 10000,
    },
    dynamic_capacity: {
      upper_bound: 100,
      scale_interval_ms: 1000,
      scale_up_step: 1,
      scale_down_step: 1,
      scale_up_min_post_claim_utilization_pct: 90,
      max_event_loop_utilization: 0.85,
      max_heap_used_fraction: 0.85,
      max_process_cpu_utilization: 0.85,
      min_utilization_for_projection: 30,
      max_event_loop_delay_ms: 10000,
      scale_down_cooldown_ms: 30000,
      scale_down_consecutive_unhealthy_readings: 3,
      ...(overrides.dynamic_capacity ?? {}),
    },
    event_loop_delay: {
      monitor: true,
      warn_threshold: 5000,
    },
    invalidate_api_key_task: {
      interval: '5m',
      removalDelay: '1h',
    },
    kibanas_per_partition: 2,
    max_attempts: 3,
    metrics_reset_interval: 30000,
    monitored_aggregated_stats_refresh_rate: 60000,
    monitored_stats_health_verbose_log: {
      enabled: false,
      level: 'debug',
      warn_delayed_task_start_in_seconds: 60,
    },
    monitored_stats_required_freshness: 4000,
    monitored_stats_running_average_window: 50,
    monitored_task_execution_thresholds: {
      default: {
        error_threshold: 90,
        warn_threshold: 80,
      },
      custom: {},
    },
    poll_interval: 500,
    request_capacity: 1000,
    request_timeouts: {
      update_by_query: 30000,
    },
    unsafe: {
      authenticate_background_task_utilization: true,
      exclude_task_types: [],
    },
    version_conflict_threshold: 80,
  } as TaskManagerConfig;

  return {
    ...baseConfig,
    ...overrides,
    dynamic_capacity: {
      ...baseConfig.dynamic_capacity,
      ...(overrides.dynamic_capacity ?? {}),
    },
  };
}

function createOpsMetrics({
  elu = 0.2,
  heapUsed = 100,
  heapLimit = 1000,
  load = 0.5,
  eventLoopDelayMs = 100,
}: {
  elu?: number;
  heapUsed?: number;
  heapLimit?: number;
  load?: number;
  eventLoopDelayMs?: number;
}): OpsMetrics {
  return {
    process: {
      event_loop_utilization: {
        utilization: elu,
      },
      event_loop_delay: eventLoopDelayMs,
      memory: {
        heap: {
          used_in_bytes: heapUsed,
          size_limit: heapLimit,
        },
      },
    },
    os: {
      load: {
        '1m': load,
      },
    },
  } as OpsMetrics;
}
