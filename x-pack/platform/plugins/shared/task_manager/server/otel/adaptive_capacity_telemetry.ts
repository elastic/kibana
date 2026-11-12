/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics, ValueType } from '@opentelemetry/api';
import type { AdaptiveCapacityState } from '../lib/adaptive_capacity';

const METER_NAME = 'kibana.task_manager';

/**
 * Publishes the heap controller's latest decision as pull-based gauges, so the
 * same numbers shown in `_health` can be charted next to process heap metrics.
 */
export const registerAdaptiveCapacityTelemetry = (
  getState: () => AdaptiveCapacityState | undefined
): void => {
  const meter = metrics.getMeter(METER_NAME);

  const capacity = meter.createObservableGauge('kibana.task_manager.adaptive_capacity.capacity', {
    description: 'Capacity chosen by the heap controller, in normal-cost tasks.',
    unit: '{task}',
    valueType: ValueType.INT,
  });
  const heapBudget = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.heap.budget',
    {
      description:
        'Heap left for new tasks after the idle baseline and the running tasks; negative while over target.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const heapProjected = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.heap.projected',
    {
      description: 'Heap the controller expects the running tasks to reach.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const slotMemory = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.slot.memory',
    {
      description: 'Heap budgeted for one normal-cost slot, from the recent task mix.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const liveRatio = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.heap.live_ratio',
    {
      description: 'Live-to-allocated heap ratio applied to the memory estimates.',
      unit: '1',
      valueType: ValueType.DOUBLE,
    }
  );
  const heapExternal = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.heap.external',
    {
      description:
        'Memory V8 tracks outside its heap (Buffers, ArrayBuffers), counted with the heap.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const memoryBudget = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.memory.budget',
    {
      description:
        'Resident memory left under the container limit after the running tasks; absent without a limit.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const memoryRss = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.memory.rss',
    {
      description: 'Resident set size seen by the controller; absent without a memory limit.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const reservationBytes = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.reservation.bytes',
    {
      description: 'Memory the running tasks reserved through the run context.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );
  const reservationTasks = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.reservation.tasks',
    {
      description: 'Running tasks holding a memory reservation.',
      unit: '{task}',
      valueType: ValueType.INT,
    }
  );
  const taskTypeMemory = meter.createObservableGauge(
    'kibana.task_manager.adaptive_capacity.task_type.memory',
    {
      description: 'Learned heap per cost unit for a task type.',
      unit: 'By',
      valueType: ValueType.INT,
    }
  );

  meter.addBatchObservableCallback(
    (result) => {
      const state = getState();
      if (!state) return;
      result.observe(capacity, state.capacity);
      result.observe(heapBudget, state.heap_budget_bytes);
      result.observe(heapProjected, state.heap_projected_bytes);
      result.observe(slotMemory, state.bytes_per_normal_task);
      result.observe(liveRatio, state.heap_live_ratio);
      result.observe(heapExternal, state.heap_external_bytes);
      if (state.memory) {
        result.observe(memoryBudget, state.memory.budget_bytes);
        result.observe(memoryRss, state.memory.rss_bytes);
      }
      result.observe(reservationBytes, state.reservations.bytes);
      result.observe(reservationTasks, state.reservations.tasks);
      for (const estimate of state.estimates) {
        result.observe(taskTypeMemory, estimate.bytes_per_cost_unit, {
          'task.type': estimate.task_type,
        });
      }
    },
    [
      capacity,
      heapBudget,
      heapProjected,
      slotMemory,
      liveRatio,
      heapExternal,
      memoryBudget,
      memoryRss,
      reservationBytes,
      reservationTasks,
      taskTypeMemory,
    ]
  );
};
