/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { IClusterClient, DocLinksServiceSetup } from '@kbn/core/server';
import { Observable, Subject } from 'rxjs';
import { tap, map, filter } from 'rxjs';
import { throttleTime } from 'rxjs';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { Logger, ServiceStatus, ServiceStatusLevels } from '@kbn/core/server';
import {
  MonitoringStats,
  summarizeMonitoringStats,
  HealthStatus,
  RawMonitoringStats,
} from '../monitoring';
import { TaskManagerConfig } from '../config';
import { logHealthMetrics } from '../lib/log_health_metrics';
import { calculateHealthStatus } from '../lib/calculate_health_status';

export type MonitoredHealth = RawMonitoringStats & {
  id: string;
  reason?: string;
  status: HealthStatus;
  timestamp: string;
};

const LEVEL_SUMMARY = {
  [ServiceStatusLevels.available.toString()]: 'Task Manager is healthy',
  [ServiceStatusLevels.degraded.toString()]: 'Task Manager is unhealthy',
  [ServiceStatusLevels.unavailable.toString()]: 'Task Manager is unavailable',
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

export function healthRoute(params: HealthRouteParams): {
  serviceStatus$: Observable<TaskManagerServiceStatus>;
  monitoredHealth$: Observable<MonitoredHealth>;
} {
  const {
    router,
    monitoringStats$,
    logger,
    taskManagerId,
    config,
    kibanaVersion,
    kibanaIndexName,
    getClusterClient,
    usageCounter,
    shouldRunTasks,
    docLinks,
    numOfKibanaInstances$,
  } = params;

  let numOfKibanaInstances = 1;
  numOfKibanaInstances$.subscribe((updatedNumber) => {
    // if there are no active nodes right now, assume there's at least 1
    numOfKibanaInstances = Math.max(updatedNumber, 1);
  });

  // if "hot" health stats are any more stale than monitored_stats_required_freshness (pollInterval +1s buffer by default)
  // consider the system unhealthy
  const requiredHotStatsFreshness: number = config.monitored_stats_required_freshness;

  function getHealthStatus(monitoredStats: MonitoringStats) {
    const summarizedStats = summarizeMonitoringStats(
      logger,
      monitoredStats,
      config,
      numOfKibanaInstances
    );
    const { status, reason } = calculateHealthStatus(
      summarizedStats,
      config,
      shouldRunTasks,
      logger
    );
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    return { id: taskManagerId, timestamp, status, reason, ...summarizedStats };
  }

  const serviceStatus$: Subject<TaskManagerServiceStatus> = new Subject<TaskManagerServiceStatus>();
  const monitoredHealth$: Subject<MonitoredHealth> = new Subject<MonitoredHealth>();

  /* keep track of last health summary, as we'll return that to the next call to _health */
  let lastMonitoredStats: MonitoringStats | null = null;

  /* Log Task Manager stats as a Debug log line at a fixed interval */
  monitoringStats$
    .pipe(
      throttleTime(requiredHotStatsFreshness),
      tap((stats) => {
        lastMonitoredStats = stats;
      }),
      // Only calculate the summarized stats (calculates all running averages and evaluates state)
      // when needed by throttling down to the requiredHotStatsFreshness
      map((stats) => withServiceStatus(getHealthStatus(stats))),
      filter(([monitoredHealth]) => monitoredHealth.status !== HealthStatus.Uninitialized)
    )
    .subscribe(([monitoredHealth, serviceStatus]) => {
      serviceStatus$.next(serviceStatus);
      monitoredHealth$.next(monitoredHealth);
      logHealthMetrics(monitoredHealth, logger, config, shouldRunTasks, docLinks);
    });

  router.get(
    {
      path: '/api/task_manager/_health',
      security: {
        authz: {
          enabled: false,
          // https://github.com/elastic/kibana/issues/136157
          reason:
            'This route is opted out from authorization. Authorization is planned but not implemented yet(breaking change).',
        },
      },
      // Uncomment when we determine that we can restrict API usage to Global admins based on telemetry
      // security: {
      //   authz: {
      //     requiredPrivileges: ['taskManager'],
      //   },
      // },
      validate: false,
      options: {
        access: 'public',
        summary: `Get task manager health`,
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      // If we are able to count usage, we want to check whether the user has access to
      // the `taskManager` feature, which is only available as part of the Global All privilege.
      if (usageCounter) {
        const clusterClient = await getClusterClient();
        const hasPrivilegesResponse = await clusterClient
          .asScoped(req)
          .asCurrentUser.security.hasPrivileges({
            body: {
              application: [
                {
                  application: `kibana-${kibanaIndexName}`,
                  resources: ['*'],
                  privileges: [`api:${kibanaVersion}:taskManager`],
                },
              ],
            },
          });

        // Keep track of total access vs admin access
        usageCounter.incrementCounter({
          counterName: `taskManagerHealthApiAccess`,
          counterType: 'taskManagerHealthApi',
          incrementBy: 1,
        });
        if (hasPrivilegesResponse.has_all_requested) {
          usageCounter.incrementCounter({
            counterName: `taskManagerHealthApiAdminAccess`,
            counterType: 'taskManagerHealthApi',
            incrementBy: 1,
          });
        }
      }

      return res.ok({
        body: lastMonitoredStats
          ? getHealthStatus(lastMonitoredStats)
          : { id: taskManagerId, timestamp: new Date().toISOString(), status: HealthStatus.Error },
      });
    }
  );
  return { serviceStatus$, monitoredHealth$ };
}

export function withServiceStatus(
  monitoredHealth: MonitoredHealth
): [MonitoredHealth, TaskManagerServiceStatus] {
  const { reason, status } = monitoredHealth;

  const level =
    status === HealthStatus.OK ? ServiceStatusLevels.available : ServiceStatusLevels.degraded;

  const defaultMessage = LEVEL_SUMMARY[level.toString()];
  const summary = reason ? `${defaultMessage} - Reason: ${reason}` : defaultMessage;

  return [
    monitoredHealth,
    {
      level,
      summary,
    },
  ];
}
