/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import { type SerializedHistogram } from './lib';
import type { ITaskMetricsAggregator } from './types';
declare const OVERDUE_BY_KEY = 'overdue_by';
declare const OVERDUE_BY_VALUES_KEY = 'overdue_by_values';
declare enum TaskOverdueMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}
interface TaskOverdueHistogram extends JsonObject {
  [OVERDUE_BY_KEY]: SerializedHistogram;
  [OVERDUE_BY_VALUES_KEY]: number[];
}
export interface TaskOverdueMetric extends JsonObject {
  [TaskOverdueMetricKeys.OVERALL]: TaskOverdueHistogram;
  [TaskOverdueMetricKeys.BY_TYPE]: {
    [key: string]: TaskOverdueHistogram;
  };
}
export declare class TaskOverdueMetricsAggregator
  implements ITaskMetricsAggregator<TaskOverdueMetric>
{
  private histograms;
  initialMetric(): TaskOverdueMetric;
  collect(): TaskOverdueMetric;
  reset(): void;
  processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent): void;
}
export {};
