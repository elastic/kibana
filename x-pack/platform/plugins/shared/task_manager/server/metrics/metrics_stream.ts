/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs';
import { set } from '@kbn/safer-lodash-set';
import { Logger } from '@kbn/core/server';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { createWrappedLogger } from '../lib/wrapped_logger';
import {
  isTaskManagerStatEvent,
  isTaskManagerMetricEvent,
  isTaskPollingCycleEvent,
  isTaskRunEvent,
} from '../task_events';
import { TaskClaimMetric, TaskClaimMetricsAggregator } from './task_claim_metrics_aggregator';
import { createAggregator } from './create_aggregator';
import { TaskRunMetric, TaskRunMetricsAggregator } from './task_run_metrics_aggregator';
import { TaskOverdueMetric, TaskOverdueMetricsAggregator } from './task_overdue_metrics_aggregator';
import { TaskManagerMetricsCollector } from './task_metrics_collector';
export interface Metrics {
  last_update: string;
  metrics: {
    task_claim?: Metric<TaskClaimMetric>;
    task_run?: Metric<TaskRunMetric>;
    task_overdue?: Metric<TaskOverdueMetric>;
  };
}

export interface Metric<T> {
  timestamp: string;
  value: T;
}

interface CreateMetricsAggregatorsOpts {
  config: TaskManagerConfig;
  logger: Logger;
  reset$: Observable<boolean>;
  taskPollingLifecycle?: TaskPollingLifecycle;
  taskManagerMetricsCollector?: TaskManagerMetricsCollector;
}
export function createMetricsAggregators({
  config,
  reset$,
  logger,
  taskPollingLifecycle,
  taskManagerMetricsCollector,
}: CreateMetricsAggregatorsOpts): AggregatedStatProvider {
  const aggregators: AggregatedStatProvider[] = [];
  const debugLogger = createWrappedLogger({ logger, tags: ['metrics-debugger'] });
  if (taskPollingLifecycle) {
    aggregators.push(
      createAggregator({
        key: 'task_claim',
        events$: taskPollingLifecycle.events,
        config,
        reset$,
        eventFilter: (event: TaskLifecycleEvent) => isTaskPollingCycleEvent(event),
        metricsAggregator: new TaskClaimMetricsAggregator(),
      }),
      createAggregator({
        key: 'task_run',
        events$: taskPollingLifecycle.events,
        config,
        logger: debugLogger,
        reset$,
        eventFilter: (event: TaskLifecycleEvent) =>
          isTaskRunEvent(event) || isTaskManagerStatEvent(event),
        metricsAggregator: new TaskRunMetricsAggregator(debugLogger),
      })
    );
  }

  if (taskManagerMetricsCollector) {
    aggregators.push(
      createAggregator({
        key: 'task_overdue',
        events$: taskManagerMetricsCollector.events,
        config,
        eventFilter: (event: TaskLifecycleEvent) => isTaskManagerMetricEvent(event),
        metricsAggregator: new TaskOverdueMetricsAggregator(),
      })
    );
  }

  return merge(...aggregators);
}

export function createMetricsStream(provider$: AggregatedStatProvider): Observable<Metrics> {
  const initialMetrics = {
    last_update: new Date().toISOString(),
    metrics: {},
  };
  return merge(
    // emit the initial metrics
    of(initialMetrics),
    // emit updated metrics whenever a provider updates a specific key on the stats
    provider$.pipe(
      map(({ key, value }) => {
        return {
          value: { timestamp: new Date().toISOString(), value },
          key,
        };
      }),
      scan((metrics: Metrics, { key, value }) => {
        // incrementally merge stats as they come in
        set(metrics.metrics, key, value);
        metrics.last_update = new Date().toISOString();
        return metrics;
      }, initialMetrics)
    )
  );
}
