/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BatchObservableCallback, metrics, ValueType } from '@opentelemetry/api';
import { TaskCost } from '../task';
import type { TaskEvent } from '../task_events';
import { isTaskRunEvent } from '../task_events';
import { unwrap } from '../lib/result_type';
import { getTaskCost } from '../task_claimers/lib/get_task_cost';
import type { TaskTypeDictionary } from '../task_type_dictionary';

export interface CapacityProviders {
  getConfiguredCapacity: () => number;
  getEffectiveCapacity: () => number;
}

const meter = metrics.getMeter('kibana.task_manager');

const slotTime = meter.createCounter('kibana.task_manager.task_run.slot_time', {
  description:
    'Seconds of normal-cost task slot occupied by completed task runs, weighted by task cost.',
  unit: 's',
  valueType: ValueType.DOUBLE,
});

const taskRuns = meter.createCounter('kibana.task_manager.task_run.completed.count', {
  description: 'Number of completed task runs, including failed ones.',
  unit: '{run}',
  valueType: ValueType.INT,
});

const configured = meter.createObservableGauge('kibana.task_manager.capacity.configured', {
  description: 'Configured capacity, in normal-cost task slots, before backpressure.',
  unit: '{task}',
  valueType: ValueType.INT,
});

const effective = meter.createObservableGauge('kibana.task_manager.capacity.effective', {
  description: 'Capacity in force, in normal-cost task slots, after backpressure.',
  unit: '{task}',
  valueType: ValueType.INT,
});

const capacityGauges = [configured, effective];

export class TaskManagerCapacityMetrics {
  private readonly observe: BatchObservableCallback;

  constructor({ getConfiguredCapacity, getEffectiveCapacity }: CapacityProviders) {
    this.observe = (result) => {
      result.observe(configured, getConfiguredCapacity());
      result.observe(effective, getEffectiveCapacity());
    };
    meter.addBatchObservableCallback(this.observe, capacityGauges);
  }

  stop(): void {
    meter.removeBatchObservableCallback(this.observe, capacityGauges);
  }
}

export const recordTaskRun = (
  event: TaskEvent<unknown, unknown>,
  definitions: TaskTypeDictionary
): void => {
  if (!isTaskRunEvent(event) || !event.timing) return;
  const { task } = unwrap(event.event);
  const { start, stop } = event.timing;
  const attributes = { 'task.type': task.taskType };
  const costWeight = getTaskCost(task, definitions) / TaskCost.Normal;
  taskRuns.add(1, attributes);
  slotTime.add((costWeight * (stop - start)) / 1000, attributes);
};
