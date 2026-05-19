/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { JsonValue } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskManagerConfig } from '../config';
import type { ITaskMetricsAggregator } from './types';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
export interface CreateMetricsAggregatorOpts<T> {
  key: string;
  config: TaskManagerConfig;
  logger?: Logger;
  reset$?: Observable<boolean>;
  events$: Observable<TaskLifecycleEvent>;
  eventFilter: (event: TaskLifecycleEvent) => boolean;
  metricsAggregator: ITaskMetricsAggregator<T>;
}
export declare function createAggregator<T extends JsonValue>({
  key,
  config,
  reset$,
  logger,
  events$,
  eventFilter,
  metricsAggregator,
}: CreateMetricsAggregatorOpts<T>): AggregatedStatProvider<T>;
