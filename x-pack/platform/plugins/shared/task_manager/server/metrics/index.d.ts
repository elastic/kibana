/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import type { Metrics } from './metrics_stream';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskManagerMetricsCollector } from './task_metrics_collector';
export type { Metrics } from './metrics_stream';
interface MetricsStreamOpts {
  config: TaskManagerConfig;
  logger: Logger;
  reset$: Observable<boolean>;
  taskPollingLifecycle?: TaskPollingLifecycle;
  taskManagerMetricsCollector?: TaskManagerMetricsCollector;
}
export declare function metricsStream({
  config,
  reset$,
  logger,
  taskPollingLifecycle,
  taskManagerMetricsCollector,
}: MetricsStreamOpts): Observable<Metrics>;
