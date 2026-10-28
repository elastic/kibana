/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/** Which API requested the nudge. */
export type ClaimNudgeSource = 'run_soon';

interface TaskClaimAttributes extends Attributes {
  duration: number;
  success: boolean;
  backpressure_active: boolean;
  backpressure_reason?: string;
}

interface TaskRunAttributes extends Attributes {
  taskType: string;
  success: boolean;
  not_timed_out: boolean;
  user_error: boolean;
  framework_error: boolean;
  rescheduled_failure: boolean;
  delay: number;
}

class TaskManagerTelemetry {
  private readonly meter = metrics.getMeter('kibana.task_manager');

  private readonly taskClaimCounter: Counter<Attributes>;
  private readonly taskRunCounter: Counter<Attributes>;

  constructor() {
    this.taskClaimCounter = this.meter.createCounter('kibana.task_manager.task_claim.count', {
      description: 'Number of times tasks were attempted to be claimed.',
      unit: '1',
      valueType: ValueType.INT,
    });
    this.taskRunCounter = this.meter.createCounter('kibana.task_manager.task_run.count', {
      description: 'Number of times tasks were attempted to be run.',
      unit: '1',
      valueType: ValueType.INT,
    });
  }

  recordTaskClaim(taskClaimAttributes: TaskClaimAttributes) {
    this.taskClaimCounter.add(1, taskClaimAttributes);
  }

  recordTaskRun(taskRunAttributes: TaskRunAttributes) {
    this.taskRunCounter.add(1, taskRunAttributes);
  }
}

export const taskManagerTelemetry = new TaskManagerTelemetry();
