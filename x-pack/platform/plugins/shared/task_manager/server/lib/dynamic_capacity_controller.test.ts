/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpsMetrics } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import { CLAIM_STRATEGY_MGET } from '../config';
import { mockLogger } from '../test_utils';
import { DynamicCapacityController } from './dynamic_capacity_controller';

const logger = mockLogger();

describe('DynamicCapacityController', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  test('scales up when projected full-capacity metrics are healthy', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));

    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(11);

    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(12);
  });

  test('scales down immediately when unhealthy and respects cooldown', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_down_cooldown_ms: 30000,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));

    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(12);

    controller.setOpsMetrics(createOpsMetrics({ elu: 0.95 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(10);

    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(5000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(10);

    jest.advanceTimersByTime(30000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(11);
  });

  test('continues scaling down when unhealthy during cooldown', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 20,
          scale_up_step: 10,
          scale_down_max_step_fraction: 0.5,
          scale_down_cooldown_ms: 30000,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(20);

    controller.setOpsMetrics(createOpsMetrics({ elu: 0.95 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(17);

    // Cooldown is active, but unhealthy signals should still trigger another scale-down.
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(15);
  });

  test('uses projection utilization for projected full-capacity health', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(20);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.3 }));

    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());

    // min_utilization_for_projection default is 30% => factor 3.33.
    expect(controller.getCapacity()).toBe(10);
  });

  test('uses proportional scale-down step when overshoot is small', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 20,
          scale_up_step: 10,
          scale_down_max_step_fraction: 0.5,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(20);

    // ELU is only slightly above its threshold (0.85), so proportional step is 1.
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.86 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(19);
  });

  test('scales down proportionally for moderate overshoot', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 20,
          scale_up_step: 10,
          scale_down_max_step_fraction: 0.5,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 10,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(20);

    // heapUsedFraction=1.275 and max_heap_used_fraction=0.85 => 1.5x over threshold.
    controller.setOpsMetrics(createOpsMetrics({ heapUsed: 1275, heapLimit: 1000 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(13);
  });

  test('caps scale-down step by max step fraction', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 20,
          scale_up_step: 15,
          scale_down_max_step_fraction: 0.5,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 5,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(20);

    // eventLoopDelay ratio is 5x, but max step fraction limits reduction to 50% of current.
    controller.setOpsMetrics(createOpsMetrics({ eventLoopDelayMs: 50000 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(10);
  });

  test('respects floor capacity even with a large proportional step', () => {
    const controller = new DynamicCapacityController({
      config: createConfig({
        capacity: 'auto',
        dynamic_capacity: {
          upper_bound: 12,
          scale_up_step: 4,
          scale_down_max_step_fraction: 1,
          max_process_cpu_utilization: 100,
        },
      }),
      logger,
      startingCapacity: 8,
    });
    controller.setPostClaimUtilizationPct(100);
    controller.setProjectionUtilizationPct(100);
    controller.setOpsMetrics(createOpsMetrics({ elu: 0.2 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(12);

    controller.setOpsMetrics(createOpsMetrics({ eventLoopDelayMs: 100000 }));
    jest.advanceTimersByTime(1000);
    controller.evaluate(Date.now());
    expect(controller.getCapacity()).toBe(8);
  });
});

function createConfig(
  overrides: Omit<Partial<TaskManagerConfig>, 'dynamic_capacity'> & {
    dynamic_capacity?: Partial<TaskManagerConfig['dynamic_capacity']>;
  }
): TaskManagerConfig {
  const baseConfig = {
    capacity: 'auto',
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
      max_event_loop_utilization: 0.85,
      max_heap_used_fraction: 0.85,
      max_process_cpu_utilization: 0.85,
      min_utilization_for_projection: 30,
      max_event_loop_delay_ms: 500,
      scale_down_cooldown_ms: 30000,
      scale_down_max_step_fraction: 0.5,
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
  eventLoopDelayMs = 100,
}: {
  elu?: number;
  heapUsed?: number;
  heapLimit?: number;
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
        '1m': 0.5,
      },
    },
  } as OpsMetrics;
}
