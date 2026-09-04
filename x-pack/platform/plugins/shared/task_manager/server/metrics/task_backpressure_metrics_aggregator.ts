/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { isOk } from '../lib/result_type';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
import type { TaskManagerBackpressure } from '../task_events';
import type { BackpressureReason } from '../lib/backpressure_reason';
import type { ITaskMetricsAggregator } from './types';

/** Point-in-time backpressure gauge: `active` (0|1) with the ES-pressure `reason`. */
export interface TaskBackpressureMetric extends JsonObject {
  active: number;
  reason: BackpressureReason | null;
}

export class TaskBackpressureMetricsAggregator
  implements ITaskMetricsAggregator<TaskBackpressureMetric>
{
  private snapshot: TaskBackpressureMetric = this.initialMetric();

  public initialMetric(): TaskBackpressureMetric {
    return {
      active: 0,
      reason: null,
    };
  }

  public collect(): TaskBackpressureMetric {
    return this.snapshot;
  }

  public reset() {
    // no-op: a gauge must keep reporting current state after a metrics reset.
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    const event = (taskEvent as TaskManagerBackpressure).event;
    if (!isOk(event)) {
      return;
    }
    const { active, reason } = event.value;
    this.snapshot = {
      active: active ? 1 : 0,
      reason,
    };
  }
}
