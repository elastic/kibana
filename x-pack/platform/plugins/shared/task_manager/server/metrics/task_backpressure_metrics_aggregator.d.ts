/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import type { BackpressureReason } from '../lib/backpressure_reason';
import type { ITaskMetricsAggregator } from './types';
/** Point-in-time backpressure gauge: `active` (0|1) with the ES-pressure `reason`. */
export interface TaskBackpressureMetric extends JsonObject {
  active: number;
  reason: BackpressureReason | null;
}
export declare class TaskBackpressureMetricsAggregator
  implements ITaskMetricsAggregator<TaskBackpressureMetric>
{
  private snapshot;
  initialMetric(): TaskBackpressureMetric;
  collect(): TaskBackpressureMetric;
  reset(): void;
  processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent): void;
}
