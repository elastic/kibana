/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLoopUtilization } from 'perf_hooks';
import { AutoscalingSignal, MAX_BACKLOG_LOAD } from './autoscaling_signal';
import type { AdaptiveCapacityState } from './adaptive_capacity';

const MB = 1024 * 1024;

const elu = (utilization: number): EventLoopUtilization => ({
  idle: 0,
  active: 0,
  utilization,
});

/** Returns fixed utilization readings: `absolute` with no arguments, `delta` for a pair. */
const eventLoopUtilizationReader = (absolute: number, delta: number) =>
  jest.fn((utilization1?: EventLoopUtilization) => elu(utilization1 ? delta : absolute));

const adaptiveState = (overrides: Partial<AdaptiveCapacityState> = {}): AdaptiveCapacityState =>
  ({
    heap_projected_bytes: 300 * MB,
    heap_target_bytes: 1000 * MB,
    memory: null,
    ...overrides,
  } as AdaptiveCapacityState);

describe('AutoscalingSignal', () => {
  const quietHeap = () => ({ usedHeapBytes: 0, heapLimitBytes: 1000 * MB });
  const idleLoop = () => eventLoopUtilizationReader(0, 0);

  test('measures slot load against the reference capacity, capped at 100', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      readHeapStats: quietHeap,
      readEventLoopUtilization: idleLoop(),
    });

    // 10 normal tasks cost 20; 5 running is half of it
    expect(signal.sample({ runningCost: 10, backlogCost: 0 })).toMatchObject({
      slot_load: 50,
      backlog_load: 50,
      reference_capacity: 10,
    });
    // a node allowed more than the reference by `capacity: auto` still reads as full
    expect(signal.sample({ runningCost: 60, backlogCost: 0 })).toMatchObject({
      slot_load: 100,
      backlog_load: MAX_BACKLOG_LOAD,
    });
  });

  test('adds the backlog to the running cost, capped at the backlog ceiling', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      readHeapStats: quietHeap,
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 20, backlogCost: 20 })).toMatchObject({
      slot_load: 100,
      backlog_load: 200,
    });
    expect(signal.sample({ runningCost: 20, backlogCost: 200 })).toMatchObject({
      backlog_load: MAX_BACKLOG_LOAD,
    });
  });

  test('keeps the last backlog when a sample has none', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      readHeapStats: quietHeap,
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 0 })).toMatchObject({ backlog_load: 0 });
    signal.sample({ runningCost: 0, backlogCost: 10 });
    expect(signal.sample({ runningCost: 0 })).toMatchObject({ backlog_load: 50 });
    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ backlog_load: 0 });
  });

  test('reads heap load from the adaptive capacity state when there is one', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      getAdaptiveState: () =>
        adaptiveState({ heap_projected_bytes: 750 * MB, heap_target_bytes: 1000 * MB }),
      readHeapStats: () => ({ usedHeapBytes: 1000 * MB, heapLimitBytes: 1000 * MB }),
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ heap_load: 75 });
  });

  test('reports the resident memory share when it is the larger pressure', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      getAdaptiveState: () =>
        adaptiveState({
          heap_projected_bytes: 200 * MB,
          heap_target_bytes: 1000 * MB,
          memory: {
            limit_bytes: 2000 * MB,
            target_bytes: 1700 * MB,
            rss_bytes: 1500 * MB,
            baseline_bytes: 600 * MB,
            projected_bytes: 1530 * MB,
            budget_bytes: 170 * MB,
          },
        }),
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ heap_load: 90 });
  });

  test('reads heap load against the heap target from V8 under a fixed capacity', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      // 75% of a 1000 MB limit is the target; 600 MB used is 80% of it
      readHeapStats: () => ({ usedHeapBytes: 600 * MB, heapLimitBytes: 1000 * MB }),
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ heap_load: 80 });
  });

  test('caps heap load at 100 when the projection is over the target', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      getAdaptiveState: () =>
        adaptiveState({ heap_projected_bytes: 1200 * MB, heap_target_bytes: 1000 * MB }),
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ heap_load: 100 });
  });

  test('reads cpu load as the event-loop utilization since the previous sample, 80% reading as full', () => {
    const readEventLoopUtilization = eventLoopUtilizationReader(0.2, 0.4);
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      readHeapStats: quietHeap,
      readEventLoopUtilization,
    });

    // first sample: nothing to diff against, the absolute reading is used
    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ cpu_load: 25 });
    expect(readEventLoopUtilization).toHaveBeenCalledTimes(1);
    // later samples: the delta since the previous absolute reading
    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ cpu_load: 50 });
    expect(readEventLoopUtilization).toHaveBeenCalledTimes(3);
    expect(readEventLoopUtilization.mock.calls[2]).toEqual([elu(0.2), elu(0.2)]);
  });

  test('caps cpu load at 100 for a pegged event loop', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 10,
      readHeapStats: quietHeap,
      readEventLoopUtilization: eventLoopUtilizationReader(1, 1),
    });

    expect(signal.sample({ runningCost: 0, backlogCost: 0 })).toMatchObject({ cpu_load: 100 });
  });

  test('reads 0 everywhere on an idle node with no reference', () => {
    const signal = new AutoscalingSignal({
      referenceCapacity: 0,
      readHeapStats: () => ({ usedHeapBytes: 0, heapLimitBytes: 0 }),
      readEventLoopUtilization: idleLoop(),
    });

    expect(signal.sample({ runningCost: 4, backlogCost: 4 })).toEqual({
      slot_load: 0,
      heap_load: 0,
      cpu_load: 0,
      backlog_load: 0,
      reference_capacity: 0,
    });
  });
});
