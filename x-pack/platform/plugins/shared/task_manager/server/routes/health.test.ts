/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, of, Subject, BehaviorSubject } from 'rxjs';
import { merge } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { httpServiceMock, docLinksServiceMock } from '@kbn/core/server/mocks';
import { healthRoute } from './health';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { sleep } from '../test_utils';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { MonitoringStats, RawMonitoringStats } from '../monitoring';
import { ServiceStatusLevels } from '@kbn/core/server';
import { configSchema, TaskManagerConfig } from '../config';
import { FillPoolResult } from '../lib/fill_pool';

jest.mock('../monitoring', () => {
  const monitoring = jest.requireActual('../monitoring');
  return {
    ...monitoring,
    summarizeMonitoringStats: jest.fn(),
  };
});

jest.mock('../lib/log_health_metrics', () => ({
  logHealthMetrics: jest.fn(),
}));

const { summarizeMonitoringStats } = jest.requireMock('../monitoring');

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockClusterClient = (response: any) => {
  const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResponse(response as any);

  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

  return { mockClusterClient, mockScopedClusterClient };
};

const timestamp = new Date().toISOString();

describe('healthRoute', () => {
  const logger = loggingSystemMock.create().get();
  const docLinks = docLinksServiceMock.create().setup();
  beforeEach(() => {
    jest.resetAllMocks();

    summarizeMonitoringStats.mockReturnValue({
      last_update: timestamp,
      stats: {
        workload: {
          timestamp,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'OK',
          timestamp,
          value: {},
        },
      },
    });
  });

  it('registers the route', async () => {
    const router = httpServiceMock.createRouter();
    healthRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/_health"`);
  });

  it('checks user privileges and increments usage counter when API is accessed', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: false,
    });
    const router = httpServiceMock.createRouter();
    healthRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        application: [
          {
            application: `kibana-foo`,
            resources: ['*'],
            privileges: [`api:8.0:taskManager`],
          },
        ],
      },
    });
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: `taskManagerHealthApiAccess`,
      counterType: 'taskManagerHealthApi',
      incrementBy: 1,
    });
  });

  it('checks user privileges and increments admin usage counter when API is accessed when user has access to task manager feature', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: true,
    });
    const router = httpServiceMock.createRouter();
    healthRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).toHaveBeenCalledWith({
      body: {
        application: [
          {
            application: `kibana-foo`,
            resources: ['*'],
            privileges: [`api:8.0:taskManager`],
          },
        ],
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(1, {
      counterName: `taskManagerHealthApiAccess`,
      counterType: 'taskManagerHealthApi',
      incrementBy: 1,
    });
    expect(mockUsageCounter.incrementCounter).toHaveBeenNthCalledWith(2, {
      counterName: `taskManagerHealthApiAdminAccess`,
      counterType: 'taskManagerHealthApi',
      incrementBy: 1,
    });
  });

  it('skips checking user privileges if usage counter is undefined', async () => {
    const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({
      has_all_requested: false,
    });
    const router = httpServiceMock.createRouter();
    healthRoute({
      router,
      monitoringStats$: of(),
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig(),
      kibanaVersion: '8.0',
      kibanaIndexName: 'foo',
      getClusterClient: () => Promise.resolve(mockClusterClient),
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);
    await handler(context, req, res);

    expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('logs the Task Manager stats at a fixed interval', async () => {
    const router = httpServiceMock.createRouter();
    const { logHealthMetrics } = jest.requireMock('../lib/log_health_metrics');

    const mockStat = mockHealthStats();
    await sleep(10);
    const skippedMockStat = mockHealthStats();
    await sleep(10);
    const nextMockStat = mockHealthStats();

    const stats$ = new Subject<MonitoringStats>();

    const id = uuidv4();
    healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: id,
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_health_verbose_log: {
          enabled: true,
          level: 'debug',
          warn_delayed_task_start_in_seconds: 100,
        },
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    stats$.next(mockStat);
    await sleep(500);
    stats$.next(skippedMockStat);
    await sleep(600);
    stats$.next(nextMockStat);

    expect(logHealthMetrics).toBeCalledTimes(2);
    expect(logHealthMetrics.mock.calls[0][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, mockStat, getTaskManagerConfig({}))
      ),
    });
    expect(logHealthMetrics.mock.calls[1][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, nextMockStat, getTaskManagerConfig({}))
      ),
    });
  });

  it(`logs at a warn level if the status is warning`, async () => {
    const router = httpServiceMock.createRouter();
    const { logHealthMetrics } = jest.requireMock('../lib/log_health_metrics');
    const reason =
      'setting HealthStatus.Warning because assumedAverageRecurringRequiredThroughputPerMinutePerKibana (78.28472222222223) < capacityPerMinutePerKibana (200)';
    summarizeMonitoringStats.mockReturnValue({
      last_update: timestamp,
      stats: {
        workload: {
          timestamp,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'warn',
          reason,
          timestamp,
          value: {},
        },
      },
    });

    const warnRuntimeStat = mockHealthStats();
    const warnConfigurationStat = mockHealthStats();
    const warnWorkloadStat = mockHealthStats();

    const stats$ = new Subject<MonitoringStats>();

    const id = uuidv4();
    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: id,
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_health_verbose_log: {
          enabled: true,
          level: 'debug',
          warn_delayed_task_start_in_seconds: 120,
        },
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const serviceStatus = firstValueFrom(serviceStatus$);

    stats$.next(warnRuntimeStat);
    await sleep(1001);
    stats$.next(warnConfigurationStat);
    await sleep(1001);
    stats$.next(warnWorkloadStat);

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.degraded,
      summary: `Task Manager is unhealthy - Reason: ${reason}`,
    });

    expect(logHealthMetrics).toBeCalledTimes(3);
    expect(logHealthMetrics.mock.calls[0][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, warnRuntimeStat, getTaskManagerConfig({}))
      ),
    });
    expect(logHealthMetrics.mock.calls[1][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, warnConfigurationStat, getTaskManagerConfig({}))
      ),
    });
    expect(logHealthMetrics.mock.calls[2][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, warnWorkloadStat, getTaskManagerConfig({}))
      ),
    });
  });

  it(`logs at an error level if the status is error`, async () => {
    const router = httpServiceMock.createRouter();
    const { logHealthMetrics } = jest.requireMock('../lib/log_health_metrics');
    const reason =
      'setting HealthStatus.Warning because assumedAverageRecurringRequiredThroughputPerMinutePerKibana (78.28472222222223) < capacityPerMinutePerKibana (200)';
    summarizeMonitoringStats.mockReturnValue({
      last_update: timestamp,
      stats: {
        workload: {
          timestamp,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'error',
          reason,
          timestamp,
          value: {},
        },
      },
    });

    const errorRuntimeStat = mockHealthStats();
    const errorConfigurationStat = mockHealthStats();
    const errorWorkloadStat = mockHealthStats();

    const stats$ = new Subject<MonitoringStats>();

    const id = uuidv4();
    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: id,
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_stats_health_verbose_log: {
          enabled: true,
          level: 'debug',
          warn_delayed_task_start_in_seconds: 120,
        },
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const serviceStatus = firstValueFrom(serviceStatus$);

    stats$.next(errorRuntimeStat);
    await sleep(1001);
    stats$.next(errorConfigurationStat);
    await sleep(1001);
    stats$.next(errorWorkloadStat);

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.degraded,
      summary: `Task Manager is unhealthy - Reason: ${reason}`,
    });

    expect(logHealthMetrics).toBeCalledTimes(3);
    expect(logHealthMetrics.mock.calls[0][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, errorRuntimeStat, getTaskManagerConfig({}))
      ),
    });
    expect(logHealthMetrics.mock.calls[1][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, errorConfigurationStat, getTaskManagerConfig({}))
      ),
    });
    expect(logHealthMetrics.mock.calls[2][0]).toMatchObject({
      id,
      timestamp: expect.any(String),
      status: expect.any(String),
      ...ignoreCapacityEstimation(
        summarizeMonitoringStats(logger, errorWorkloadStat, getTaskManagerConfig({}))
      ),
    });
  });

  it('returns a error status if the overall stats have not been updated within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();
    const coldTimestamp = new Date(Date.now() - 3001).toISOString();
    summarizeMonitoringStats.mockReturnValue({
      last_update: coldTimestamp,
      stats: {
        workload: {
          timestamp: coldTimestamp,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'OK',
          timestamp: coldTimestamp,
          value: {},
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();

    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const serviceStatus = firstValueFrom(serviceStatus$);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await sleep(0);

    stats$.next(
      mockHealthStats({
        last_update: coldTimestamp,
      })
    );

    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
            logger,
            mockHealthStats({
              last_update: expect.any(String),
              stats: {
                configuration: {
                  timestamp: expect.any(String),
                },
                workload: {
                  timestamp: expect.any(String),
                },
                runtime: {
                  timestamp: expect.any(String),
                  value: {
                    polling: {
                      last_successful_poll: expect.any(String),
                    },
                  },
                },
              },
            }),
            getTaskManagerConfig({})
          )
        ),
      },
    });

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.degraded,
      summary:
        'Task Manager is unhealthy - Reason: setting HealthStatus.Error because of expired hot timestamps',
    });
  });

  it('returns a error status if the workload stats have not been updated within the required cold freshness', async () => {
    const coldTimestamp = new Date(Date.now() - 120000).toISOString();
    const router = httpServiceMock.createRouter();
    summarizeMonitoringStats.mockReturnValue({
      last_update: timestamp,
      stats: {
        workload: {
          timestamp: coldTimestamp,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'OK',
          timestamp,
          value: {},
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();

    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 5000,
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });

    const serviceStatus = firstValueFrom(serviceStatus$);

    await sleep(0);

    stats$.next(
      mockHealthStats({
        stats: {
          workload: {
            timestamp: coldTimestamp,
          },
        },
      })
    );

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    await sleep(2000);

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.degraded,
      summary:
        'Task Manager is unhealthy - Reason: setting HealthStatus.Error because of expired cold timestamps',
    });
    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
            logger,
            mockHealthStats({
              last_update: expect.any(String),
              stats: {
                configuration: {
                  timestamp: expect.any(String),
                },
                workload: {
                  timestamp: expect.any(String),
                },
                runtime: {
                  timestamp: expect.any(String),
                  value: {
                    polling: {
                      last_successful_poll: expect.any(String),
                    },
                  },
                },
              },
            }),
            getTaskManagerConfig()
          )
        ),
      },
    });
  });

  it('returns a error status if the poller hasnt polled within the required hot freshness', async () => {
    const router = httpServiceMock.createRouter();

    const stats$ = new Subject<MonitoringStats>();
    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });
    const serviceStatus = firstValueFrom(serviceStatus$);
    await sleep(0);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const last_successful_poll = new Date(Date.now() - 3001).toISOString();
    stats$.next(
      mockHealthStats({
        stats: {
          runtime: {
            value: {
              polling: {
                last_successful_poll,
              },
            },
          },
        },
      })
    );

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.degraded,
      summary:
        'Task Manager is unhealthy - Reason: setting HealthStatus.Error because of expired hot timestamps',
    });
    expect(await handler(context, req, res)).toMatchObject({
      body: {
        status: 'error',
        ...ignoreCapacityEstimation(
          summarizeMonitoringStats(
            logger,
            mockHealthStats({
              last_update: expect.any(String),
              stats: {
                configuration: {
                  timestamp: expect.any(String),
                },
                workload: {
                  timestamp: expect.any(String),
                },
                runtime: {
                  timestamp: expect.any(String),
                  value: {
                    polling: {
                      last_successful_poll,
                    },
                  },
                },
              },
            }),
            getTaskManagerConfig()
          )
        ),
      },
    });
  });

  it('returns a OK status for empty if shouldRunTasks is false', async () => {
    const lastUpdate = new Date().toISOString();
    const router = httpServiceMock.createRouter();
    summarizeMonitoringStats.mockReturnValue({
      last_update: lastUpdate,
      stats: {
        workload: {
          timestamp: lastUpdate,
          value: {},
          status: 'OK',
        },
        capacity_estimation: {
          status: 'OK',
          timestamp: lastUpdate,
          value: {},
        },
      },
    });

    const stats$ = new Subject<MonitoringStats>();
    const { serviceStatus$ } = healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: uuidv4(),
      config: getTaskManagerConfig({
        monitored_stats_required_freshness: 1000,
        monitored_aggregated_stats_refresh_rate: 60000,
      }),
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: false,
      docLinks,
      numOfKibanaInstances$: new BehaviorSubject(1),
    });
    const serviceStatus = firstValueFrom(serviceStatus$);
    await sleep(0);

    stats$.next({
      last_update: lastUpdate,
      stats: {},
    });

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments({}, {}, ['ok']);

    expect(await serviceStatus).toMatchObject({
      level: ServiceStatusLevels.available,
      summary: 'Task Manager is healthy',
    });
    expect(await handler(context, req, res)).toMatchObject({
      body: {
        id: expect.any(String),
        timestamp: expect.any(String),
        status: 'OK',
        last_update: lastUpdate,
        stats: {},
      },
    });
  });

  it('calls summarizeMonitoringStats with the latest number of Kibana nodes', async () => {
    const router = httpServiceMock.createRouter();
    const stats$ = new Subject<MonitoringStats>();
    const numOfKibanaInstances$ = new BehaviorSubject(1);

    const id = uuidv4();
    const config = getTaskManagerConfig({
      monitored_stats_required_freshness: 1000,
      monitored_stats_health_verbose_log: {
        enabled: true,
        level: 'debug',
        warn_delayed_task_start_in_seconds: 100,
      },
      monitored_aggregated_stats_refresh_rate: 60000,
    });
    healthRoute({
      router,
      monitoringStats$: stats$,
      logger,
      taskManagerId: id,
      config,
      kibanaVersion: '8.0',
      kibanaIndexName: '.kibana',
      getClusterClient: () => Promise.resolve(elasticsearchServiceMock.createClusterClient()),
      usageCounter: mockUsageCounter,
      shouldRunTasks: true,
      docLinks,
      numOfKibanaInstances$,
    });

    stats$.next(mockHealthStats());
    expect(summarizeMonitoringStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      1
    );

    await sleep(1000);
    numOfKibanaInstances$.next(2);
    stats$.next(mockHealthStats());
    expect(summarizeMonitoringStats).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      2
    );
  });
});

function ignoreCapacityEstimation(stats: RawMonitoringStats) {
  stats.stats.capacity_estimation = expect.any(Object);
  return stats;
}

function mockHealthStats(overrides = {}) {
  const stub: MonitoringStats = {
    last_update: new Date().toISOString(),
    stats: {
      configuration: {
        timestamp: new Date().toISOString(),
        value: {
          capacity: { config: 10, as_cost: 20, as_workers: 10 },
          claim_strategy: 'update_by_query',
          poll_interval: 3000,
          request_capacity: 1000,
          monitored_aggregated_stats_refresh_rate: 5000,
          monitored_stats_running_average_window: 50,
          monitored_task_execution_thresholds: {
            default: {
              error_threshold: 90,
              warn_threshold: 80,
            },
            custom: {},
          },
        },
      },
      workload: {
        timestamp: new Date().toISOString(),
        value: {
          count: 4,
          cost: 8,
          task_types: {
            actions_telemetry: { count: 2, cost: 4, status: { idle: 2 } },
            alerting_telemetry: { count: 1, cost: 2, status: { idle: 1 } },
            session_cleanup: { count: 1, cost: 2, status: { idle: 1 } },
          },
          schedule: [],
          overdue: 0,
          overdue_cost: 2,
          overdue_non_recurring: 0,
          estimatedScheduleDensity: [],
          non_recurring: 20,
          non_recurring_cost: 40,
          owner_ids: [0, 0, 0, 1, 2, 0, 0, 2, 2, 2, 1, 2, 1, 1],
          estimated_schedule_density: [],
          capacity_requirements: {
            per_minute: 150,
            per_hour: 360,
            per_day: 820,
          },
        },
      },
      runtime: {
        timestamp: new Date().toISOString(),
        value: {
          drift: [1000, 60000],
          drift_by_type: {},
          load: [0, 100, 75],
          execution: {
            duration: {},
            duration_by_persistence: {},
            persistence: [],
            result_frequency_percent_as_number: {},
          },
          polling: {
            last_successful_poll: new Date().toISOString(),
            duration: [500, 400, 3000],
            claim_conflicts: [0, 100, 75],
            claim_mismatches: [0, 100, 75],
            claim_duration: [0, 100, 75],
            claim_stale_tasks: [0, 100, 75],
            result_frequency_percent_as_number: [
              FillPoolResult.NoTasksClaimed,
              FillPoolResult.NoTasksClaimed,
              FillPoolResult.NoTasksClaimed,
            ],
            persistence: [],
          },
        },
      },
    },
  };
  return merge(stub, overrides) as unknown as MonitoringStats;
}

const getTaskManagerConfig = (overrides: Partial<TaskManagerConfig> = {}) =>
  configSchema.validate(
    overrides.monitored_stats_required_freshness
      ? {
          // use `monitored_stats_required_freshness` as poll interval otherwise we might
          // fail validation as it must be greather than the poll interval
          poll_interval: overrides.monitored_stats_required_freshness,
          ...overrides,
        }
      : overrides
  );
