/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { IClusterClient, DocLinksServiceSetup } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger, ServiceStatus } from '@kbn/core/server';
import type { MonitoringStats, RawMonitoringStats } from '../monitoring';
import type { HealthStatus } from '../monitoring';
import type { TaskManagerConfig } from '../config';
export type MonitoredHealth = RawMonitoringStats & {
  id: string;
  reason?: string;
  status: HealthStatus;
  timestamp: string;
};
/**
 * We enforce a `meta` of `never` because this meta gets duplicated into *every dependant plugin*, and
 * this will then get logged out when logging is set to Verbose.
 * We used to pass in the the entire MonitoredHealth into this `meta` field, but this means that the
 * whole MonitoredHealth JSON (which can be quite big) was duplicated dozens of times and when we
 * try to view logs in Discover, it fails to render as this JSON was often dozens of levels deep.
 */
type TaskManagerServiceStatus = ServiceStatus<never>;
export interface HealthRouteParams {
  router: IRouter;
  monitoringStats$: Observable<MonitoringStats>;
  logger: Logger;
  taskManagerId: string;
  config: TaskManagerConfig;
  kibanaVersion: string;
  kibanaIndexName: string;
  shouldRunTasks: boolean;
  getClusterClient: () => Promise<IClusterClient>;
  usageCounter?: UsageCounter;
  docLinks: DocLinksServiceSetup;
  numOfKibanaInstances$: Observable<number>;
}
export declare function healthRoute(params: HealthRouteParams): {
  serviceStatus$: Observable<TaskManagerServiceStatus>;
  monitoredHealth$: Observable<MonitoredHealth>;
};
export declare function withServiceStatus(
  monitoredHealth: MonitoredHealth
): [MonitoredHealth, TaskManagerServiceStatus];
export {};
