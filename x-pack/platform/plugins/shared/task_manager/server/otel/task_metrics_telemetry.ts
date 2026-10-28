/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Attributes,
  type Counter,
  type Histogram,
  type ObservableGauge,
  metrics,
  ValueType,
} from '@opentelemetry/api';
import { BACKPRESSURE_REASONS, type BackpressureReason } from '../lib/backpressure_reason';
import { getTaskTypeGroup } from '../metrics/lib';
import type { TaskManagerMetrics } from '../metrics/task_metrics_collector';
import type { TaskTypeDictionary } from '../task_type_dictionary';

const ATTR_TASK_TYPE = 'task_type';
const ATTR_TASK_TYPE_GROUP = 'task_type_group';
const ATTR_TASK_STATUS = 'kibana.task.status';
const ATTR_ERROR_TYPE = 'error.type';
const ATTR_CLAIM_STATUS = 'kibana.task_manager.claim.status';
const ATTR_BACKPRESSURE_REASON = 'kibana.task_manager.backpressure.reason';

const OVERDUE_TOTAL_KEY = 'total';

// 1.8s is the threshold of the existing claim-delayed SLO
const CLAIM_DURATION_BUCKETS_SECONDS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 1.8, 2.5, 5, 10, 30];
const DELAY_BUCKETS_SECONDS = [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 5400];

export type TaskStatus = 'success' | 'error';
export type TaskErrorType = 'user' | 'framework';
export type TaskClaimStatus = 'success' | 'error';

export interface TaskRunRecord {
  taskType: string;
  taskTypeGroup?: string;
  success: boolean;
  /** Only meaningful when `success` is false. */
  errorType?: TaskErrorType;
  timedOut: boolean;
  rescheduledFailure: boolean;
}

export interface TaskClaimRecord {
  success: boolean;
  durationMs?: number;
}

export interface TaskBackpressureRecord {
  active: boolean;
  reason: BackpressureReason | null;
}

/** Only the `actions` and `alerting` groups are reported, matching the existing `by_type` rollups. */
const getTaskTypeAttributes = (taskType: string, taskTypeGroup?: string): Attributes => {
  const group = getTaskTypeGroup(taskTypeGroup);
  return {
    [ATTR_TASK_TYPE]: taskType,
    ...(group ? { [ATTR_TASK_TYPE_GROUP]: group } : {}),
  };
};

class TaskManagerMetricsTelemetry {
  private readonly meter = metrics.getMeter('kibana.task_manager');

  private readonly taskExecutionCounter: Counter<Attributes>;
  private readonly taskExecutionTimeoutCounter: Counter<Attributes>;
  private readonly taskExecutionRescheduledFailureCounter: Counter<Attributes>;
  private readonly taskExecutionDelayHistogram: Histogram<Attributes>;
  private readonly taskClaimCounter: Counter<Attributes>;
  private readonly taskClaimDurationHistogram: Histogram<Attributes>;
  private readonly taskClaimLastTimeGauge: ObservableGauge<Attributes>;
  private readonly taskOverdueCountGauge: ObservableGauge<Attributes>;
  private readonly taskOverdueDelayHistogram: Histogram<Attributes>;
  private readonly backpressureActiveGauge: ObservableGauge<Attributes>;
  private readonly backpressureReasonGauge: ObservableGauge<Attributes>;

  private lastClaimTimeSeconds?: number;
  // Observable gauges keep exporting the last value of every attribute set they have
  // observed under cumulative temporality, so every attribute set ever observed must
  // keep being observed (as 0 when no longer current) rather than dropped.
  private overdueCounts: Map<string, { count: number; attributes: Attributes }> = new Map();
  private backpressure: TaskBackpressureRecord = { active: false, reason: null };

  constructor() {
    this.taskExecutionCounter = this.meter.createCounter('kibana.task.execution.count', {
      description: 'Number of task executions, by task type and outcome.',
      unit: '{execution}',
      valueType: ValueType.INT,
    });
    this.taskExecutionTimeoutCounter = this.meter.createCounter(
      'kibana.task.execution.timeout.count',
      {
        description: 'Number of task executions that exceeded their timeout.',
        unit: '{execution}',
        valueType: ValueType.INT,
      }
    );
    this.taskExecutionRescheduledFailureCounter = this.meter.createCounter(
      'kibana.task.execution.rescheduled_failure.count',
      {
        description: 'Number of failed task executions that were rescheduled for retry.',
        unit: '{execution}',
        valueType: ValueType.INT,
      }
    );
    this.taskExecutionDelayHistogram = this.meter.createHistogram('kibana.task.execution.delay', {
      description: 'Delay between when a task was scheduled to run and when it started running.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DELAY_BUCKETS_SECONDS },
    });
    this.taskClaimCounter = this.meter.createCounter('kibana.task_manager.claim.count', {
      description: 'Number of task claim cycles, by outcome.',
      unit: '{claim}',
      valueType: ValueType.INT,
    });
    this.taskClaimDurationHistogram = this.meter.createHistogram(
      'kibana.task_manager.claim.duration',
      {
        description: 'Duration of task claim cycles.',
        unit: 's',
        valueType: ValueType.DOUBLE,
        advice: { explicitBucketBoundaries: CLAIM_DURATION_BUCKETS_SECONDS },
      }
    );
    this.taskClaimLastTimeGauge = this.meter.createObservableGauge(
      'kibana.task_manager.claim.last_time',
      {
        description:
          'Time of the most recent task claim cycle, successful or not, in seconds since the Unix epoch.',
        unit: 's',
        valueType: ValueType.DOUBLE,
      }
    );
    this.taskOverdueCountGauge = this.meter.createObservableGauge('kibana.task.overdue.count', {
      description: 'Number of tasks currently overdue, by task type.',
      unit: '{task}',
      valueType: ValueType.INT,
    });
    this.taskOverdueDelayHistogram = this.meter.createHistogram('kibana.task.overdue.delay', {
      description: 'How long tasks are overdue, sampled each time overdue tasks are counted.',
      unit: 's',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DELAY_BUCKETS_SECONDS },
    });
    this.backpressureActiveGauge = this.meter.createObservableGauge(
      'kibana.task_manager.backpressure.active',
      {
        description: 'Whether task claiming is currently under backpressure (1) or not (0).',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
    this.backpressureReasonGauge = this.meter.createObservableGauge(
      'kibana.task_manager.backpressure.reason',
      {
        description:
          'Whether each backpressure reason is the current one (1) or not (0); every reason is reported.',
        unit: '1',
        valueType: ValueType.INT,
      }
    );

    this.taskClaimLastTimeGauge.addCallback((result) => {
      // nothing is reported until the first claim cycle completes
      if (this.lastClaimTimeSeconds != null) {
        result.observe(this.lastClaimTimeSeconds);
      }
    });
    this.taskOverdueCountGauge.addCallback((result) => {
      for (const { count, attributes } of this.overdueCounts.values()) {
        result.observe(count, attributes);
      }
    });
    this.backpressureActiveGauge.addCallback((result) => {
      result.observe(this.backpressure.active ? 1 : 0);
    });
    this.backpressureReasonGauge.addCallback((result) => {
      const { active, reason } = this.backpressure;
      for (const candidate of BACKPRESSURE_REASONS) {
        result.observe(active && reason === candidate ? 1 : 0, {
          [ATTR_BACKPRESSURE_REASON]: candidate,
        });
      }
    });
  }

  /** Records the outcome of a single task execution. */
  recordTaskRun({
    taskType,
    taskTypeGroup,
    success,
    errorType,
    timedOut,
    rescheduledFailure,
  }: TaskRunRecord) {
    const typeAttributes = getTaskTypeAttributes(taskType, taskTypeGroup);
    const status: TaskStatus = success ? 'success' : 'error';
    this.taskExecutionCounter.add(1, {
      ...typeAttributes,
      [ATTR_TASK_STATUS]: status,
      ...(!success && errorType ? { [ATTR_ERROR_TYPE]: errorType } : {}),
    });

    if (timedOut) {
      this.taskExecutionTimeoutCounter.add(1, typeAttributes);
    }
    if (!success && rescheduledFailure) {
      this.taskExecutionRescheduledFailureCounter.add(1, typeAttributes);
    }
  }

  /** Records how long a task waited past its scheduled time before it started running. */
  recordTaskRunDelay(taskType: string, delaySeconds: number, taskTypeGroup?: string) {
    this.taskExecutionDelayHistogram.record(
      delaySeconds,
      getTaskTypeAttributes(taskType, taskTypeGroup)
    );
  }

  /** Records the outcome and duration of a single task claim cycle. */
  recordTaskClaim({ success, durationMs }: TaskClaimRecord) {
    this.lastClaimTimeSeconds = Date.now() / 1000;
    const status: TaskClaimStatus = success ? 'success' : 'error';
    this.taskClaimCounter.add(1, { [ATTR_CLAIM_STATUS]: status });
    if (durationMs != null) {
      this.taskClaimDurationHistogram.record(durationMs / 1000);
    }
  }

  /** Replaces the overdue task snapshot with the latest Elasticsearch aggregation result. */
  recordTaskOverdue(
    numOverdueTasks: TaskManagerMetrics['numOverdueTasks'],
    definitions: TaskTypeDictionary
  ) {
    for (const overdue of this.overdueCounts.values()) {
      overdue.count = 0;
    }

    for (const [taskType, buckets] of Object.entries(numOverdueTasks)) {
      // the overall value is the sum of the per-type series
      if (taskType === OVERDUE_TOTAL_KEY) continue;

      const attributes = getTaskTypeAttributes(taskType, definitions.get(taskType)?.taskTypeGroup);
      let count = 0;
      for (const { key, doc_count: docCount } of buckets ?? []) {
        const overdueBySeconds = parseInt(`${key}`, 10);
        count += docCount;
        for (let i = 0; i < docCount; i++) {
          this.taskOverdueDelayHistogram.record(overdueBySeconds, attributes);
        }
      }
      this.overdueCounts.set(taskType, { count, attributes });
    }
  }

  /** Updates the current backpressure state reported by the backpressure gauges. */
  recordTaskBackpressure(backpressure: TaskBackpressureRecord) {
    this.backpressure = backpressure;
  }
}

export const taskManagerMetricsTelemetry = new TaskManagerMetricsTelemetry();
