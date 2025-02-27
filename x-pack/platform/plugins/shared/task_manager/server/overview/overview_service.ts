/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { NodeResult, parseAggs } from './parse_aggs';
import { TASK_MANAGER_INDEX } from '../constants';

interface ConstructorOpts {
  logger: Logger;
}

interface InitializeOpts {
  esClient: ElasticsearchClient;
  getEventLogClient: (request: KibanaRequest) => IEventLogClient;
}

interface GetOverviewParams {
  req: KibanaRequest;
  start: string;
  end: string;
}

interface GetOverviewResult {
  numRecurringTasks: number;
  numNonrecurringTasks: number;
  numTasks: number;
  numBackgroundNodes: number;
  byNode: NodeResult[];
}

export class OverviewService {
  private esClient?: ElasticsearchClient;
  private getEventLogClient?: (request: KibanaRequest) => IEventLogClient;
  private initialized = false;

  constructor(private readonly opts: ConstructorOpts) {}

  public initialize(opts: InitializeOpts) {
    this.getEventLogClient = opts.getEventLogClient;
    this.esClient = opts.esClient;
    this.initialized = true;
  }

  public async getOverview(params: GetOverviewParams): Promise<GetOverviewResult> {
    if (!this.initialized || !this.getEventLogClient || !this.esClient) {
      throw new Error('overview service not initialized');
    }

    const { req, start, end } = params;
    const eventLogClient = await this.getEventLogClient(req);

    try {
      const results = await Promise.all([
        this.esClient.count({
          index: TASK_MANAGER_INDEX,
          query: {
            bool: {
              filter: [{ term: { type: 'task' } }, { exists: { field: 'task.schedule.interval' } }],
            },
          },
        }),
        this.esClient.count({
          index: TASK_MANAGER_INDEX,
          query: {
            bool: {
              filter: [{ term: { type: 'task' } }],
              must_not: [{ exists: { field: 'task.schedule.interval' } }],
            },
          },
        }),
        this.esClient.count({
          index: TASK_MANAGER_INDEX,
          query: {
            bool: {
              filter: [{ term: { type: 'background-task-node' } }],
            },
          },
        }),
      ]);

      const claimOverview = await eventLogClient.aggregateTaskManagerEvents({
        start,
        end,
        filter: `event.action: "claim"`,
        aggs: {
          serverUuid: {
            terms: {
              size: 100,
              field: 'kibana.server_uuid',
            },
            aggs: {
              outcome: {
                terms: {
                  field: 'event.outcome',
                },
              },
              metrics: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '10s',
                },
                aggs: {
                  maxDuration: { max: { field: 'event.duration' } },
                  avgDuration: { avg: { field: 'event.duration' } },
                  maxLoad: { max: { field: 'kibana.task_claim.load' } },
                  avgLoad: { avg: { field: 'kibana.task_claim.load' } },
                },
              },
            },
          },
        },
      });

      const runOverview = await eventLogClient.aggregateTaskManagerEvents({
        start,
        end,
        filter: `event.action: "run"`,
        aggs: {
          serverUuid: {
            terms: {
              size: 100,
              field: 'kibana.server_uuid',
            },
            aggs: {
              outcome: {
                terms: {
                  field: 'event.outcome',
                },
              },
              type: {
                terms: {
                  size: 1000,
                  field: 'kibana.task.type',
                },
                aggs: {
                  outcome: {
                    terms: {
                      field: 'event.outcome',
                    },
                  },
                },
              },
              metrics: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '10s',
                },
                aggs: {
                  maxDuration: { max: { field: 'event.duration' } },
                  avgDuration: { avg: { field: 'event.duration' } },
                  maxScheduleDelay: { max: { field: 'kibana.task.schedule_delay' } },
                  avgScheduleDelay: { avg: { field: 'kibana.task.schedule_delay' } },
                  maxEventLoop: { max: { field: 'kibana.task.event_loop_blockages' } },
                },
              },
              errors: {
                categorize_text: {
                  field: 'error.message',
                },
                aggs: {
                  type: {
                    terms: {
                      size: 1000,
                      field: 'kibana.task.type',
                    },
                  },
                },
              },
            },
          },
        },
      });

      return {
        numRecurringTasks: results[0].count,
        numNonrecurringTasks: results[1].count,
        numTasks: results[0].count + results[1].count,
        numBackgroundNodes: results[2].count,
        // @ts-ignore
        byNode: parseAggs(claimOverview.aggregations, runOverview.aggregations),
      };
    } catch (err) {
      this.opts.logger.info(`error searching event log for task manager events: ${err.message}`);
      throw err;
    }
  }
}
