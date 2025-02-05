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
  Logger,
} from '@kbn/core/server';
import { IClusterClient } from '@kbn/core/server';
import { Observable, Subject } from 'rxjs';
import { throttleTime, tap, map } from 'rxjs';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { MonitoringStats } from '../monitoring';
import { TaskManagerConfig } from '../config';
import {
  BackgroundTaskUtilizationStat,
  PublicBackgroundTaskUtilizationStat,
  summarizeUtilizationStats,
} from '../monitoring/background_task_utilization_statistics';
import { MonitoredStat } from '../monitoring/monitoring_stats_stream';

export interface MonitoredUtilization {
  process_uuid: string;
  timestamp: string;
  last_update: string;
  stats:
    | MonitoredStat<BackgroundTaskUtilizationStat>
    | MonitoredStat<PublicBackgroundTaskUtilizationStat>
    | null;
}

export interface BackgroundTaskUtilRouteParams {
  router: IRouter;
  monitoringStats$: Observable<MonitoringStats>;
  logger: Logger;
  taskManagerId: string;
  config: TaskManagerConfig;
  kibanaVersion: string;
  kibanaIndexName: string;
  getClusterClient: () => Promise<IClusterClient>;
  usageCounter?: UsageCounter;
}

export function backgroundTaskUtilizationRoute(
  params: BackgroundTaskUtilRouteParams
): Observable<MonitoredUtilization> {
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
  } = params;

  // Create an internal and public route so we can test out experimental metrics
  const routeOptions = [
    { basePath: 'internal', isInternal: true, isAuthenticated: true },
    {
      basePath: 'api',
      isInternal: false,
      isAuthenticated: config.unsafe.authenticate_background_task_utilization ?? true,
    },
  ];

  const requiredHotStatsFreshness: number = config.monitored_stats_required_freshness;

  function getBackgroundTaskUtilization(monitoredStats: MonitoringStats, isInternal: boolean) {
    const summarizedStats = summarizeUtilizationStats({
      lastUpdate: monitoredStats.last_update,
      monitoredStats: monitoredStats.stats.utilization,
      isInternal,
    });
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    return { process_uuid: taskManagerId, timestamp, ...summarizedStats };
  }

  const monitoredUtilization$: Subject<MonitoredUtilization> = new Subject<MonitoredUtilization>();
  /* keep track of last utilization summary, as we'll return that to the next call to _background_task_utilization */
  let lastMonitoredStats: MonitoringStats | null = null;

  monitoringStats$
    .pipe(
      throttleTime(requiredHotStatsFreshness),
      tap((stats) => {
        lastMonitoredStats = stats;
      }),
      // Only calculate the summarized stats (calculates all running averages and evaluates state)
      // when needed by throttling down to the requiredHotStatsFreshness
      map((stats) => getBackgroundTaskUtilization(stats, true))
    )
    .subscribe((utilizationStats) => {
      monitoredUtilization$.next(utilizationStats);
      if (utilizationStats.stats == null) {
        logger.debug('Unable to get Task Manager background task utilization metrics.');
      }
    });

  routeOptions.forEach((routeOption) => {
    router.get(
      {
        path: `/${routeOption.basePath}/task_manager/_background_task_utilization`,
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization. It can be accessed with JWT credentials.',
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
          access: 'public', // access must be public to allow "system" users, like metrics collectors, to access these routes
          authRequired: routeOption.isAuthenticated ?? true,
          // The `security:acceptJWT` tag allows route to be accessed with JWT credentials. It points to
          // ROUTE_TAG_ACCEPT_JWT from '@kbn/security-plugin/server' that cannot be imported here directly.
          tags: ['security:acceptJWT'],
        },
      },
      async function (
        _: RequestHandlerContext,
        req: KibanaRequest<unknown, unknown, unknown>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse> {
        // If we are able to count usage, we want to check whether the user has access to
        // the `taskManager` feature, which is only available as part of the Global All privilege.
        if (usageCounter && routeOption.isAuthenticated) {
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
            counterName: `taskManagerBackgroundTaskUtilApiAccess`,
            counterType: 'taskManagerBackgroundTaskUtilApi',
            incrementBy: 1,
          });
          if (hasPrivilegesResponse.has_all_requested) {
            usageCounter.incrementCounter({
              counterName: `taskManagerBackgroundTaskUtilApiAdminAccess`,
              counterType: 'taskManagerBackgroundTaskUtilApi',
              incrementBy: 1,
            });
          }
        }

        return res.ok({
          body: lastMonitoredStats
            ? getBackgroundTaskUtilization(lastMonitoredStats, routeOption.isInternal)
            : { process_uuid: taskManagerId, timestamp: new Date().toISOString(), stats: {} },
        });
      }
    );
  });

  return monitoredUtilization$;
}
