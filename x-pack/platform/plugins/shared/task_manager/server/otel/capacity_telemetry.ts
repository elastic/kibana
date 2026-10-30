/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics, ValueType } from '@opentelemetry/api';
import { TaskCost } from '../task';
import type { TaskEvent } from '../task_events';
import { isTaskRunEvent } from '../task_events';
import { unwrap } from '../lib/result_type';
import { getTaskCost } from '../task_claimers/lib/get_task_cost';
import type { TaskTypeDictionary } from '../task_type_dictionary';

export interface CapacityProviders {
  getConfiguredCapacity: () => number;
  getEffectiveCapacity: () => number;
  getOccupiedCost: () => number;
}

const meter = metrics.getMeter('kibana.task_manager');

const slotTime = meter.createCounter('kibana.task_manager.task_run.slot_time', {
  description:
    'Milliseconds of normal-cost task slot occupied by completed task runs, weighted by task cost.',
  unit: 'ms',
  valueType: ValueType.INT,
});

const pollsSkipped = meter.createCounter('kibana.task_manager.poll.skipped_no_capacity.count', {
  description: 'Number of polls skipped because the task pool had no available capacity.',
  unit: '1',
  valueType: ValueType.INT,
});

const configured = meter.createObservableGauge('kibana.task_manager.capacity.configured', {
  description: 'Configured capacity, in normal-cost task slots, before backpressure.',
  unit: '1',
  valueType: ValueType.INT,
});

const effective = meter.createObservableGauge('kibana.task_manager.capacity.effective', {
  description: 'Capacity in force, in normal-cost task slots, after backpressure.',
  unit: '1',
  valueType: ValueType.INT,
});

const occupiedCost = meter.createObservableGauge('kibana.task_manager.capacity.occupied_cost', {
  description: 'Sum of the costs of the tasks currently running in the pool.',
  unit: '1',
  valueType: ValueType.INT,
});

let capacityProviders: CapacityProviders | undefined;

meter.addBatchObservableCallback(
  (result) => {
    if (!capacityProviders) return;
    result.observe(configured, capacityProviders.getConfiguredCapacity());
    result.observe(effective, capacityProviders.getEffectiveCapacity());
    result.observe(occupiedCost, capacityProviders.getOccupiedCost());
  },
  [configured, effective, occupiedCost]
);

export const registerCapacityProviders = (providers: CapacityProviders): void => {
  capacityProviders = providers;
};

export const recordPollSkippedNoCapacity = (): void => {
  pollsSkipped.add(1);
};

export const recordSlotTime = (
  event: TaskEvent<unknown, unknown>,
  definitions: TaskTypeDictionary
): void => {
  if (!isTaskRunEvent(event) || !event.timing) return;
  const { task } = unwrap(event.event);
  const { start, stop } = event.timing;
  slotTime.add(Math.round((getTaskCost(task, definitions) / TaskCost.Normal) * (stop - start)), {
    'task.type': task.taskType,
  });
};
