/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { Observable, Subject } from 'rxjs';
import type { Metrics } from '../metrics';
export interface NodeMetrics {
  process_uuid: string;
  timestamp: string;
  last_update: string;
  metrics: Metrics['metrics'] | null;
}
export interface MetricsRouteParams {
  router: IRouter;
  logger: Logger;
  metrics$: Observable<Metrics>;
  resetMetrics$: Subject<boolean>;
  taskManagerId: string;
}
export declare function metricsRoute(params: MetricsRouteParams): void;
