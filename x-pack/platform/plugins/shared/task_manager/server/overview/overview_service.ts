/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { parseAggs } from './parse_aggs';

interface ConstructorOpts {
  logger: Logger;
}

interface InitializeOpts {
  getEventLogClient: (request: KibanaRequest) => IEventLogClient;
}

interface GetOverviewParams {
  req: KibanaRequest;
  start: string;
  end: string;
}

export class OverviewService {
  private getEventLogClient?: (request: KibanaRequest) => IEventLogClient;
  private initialized = false;

  constructor(private readonly opts: ConstructorOpts) {}

  public initialize(opts: InitializeOpts) {
    this.getEventLogClient = opts.getEventLogClient;
    this.initialized = true;
  }

  public async getOverview(params: GetOverviewParams) {
    if (!this.initialized || !this.getEventLogClient) {
      throw new Error('overview service not initialized');
    }

    const { req, start, end } = params;
    const eventLogClient = await this.getEventLogClient(req);

    try {
      const claimOverview = await eventLogClient.aggregateTaskManagerEvents({
        start,
        end,
        filter: `event.action: "claim"`,
        aggs: {
          serverUuid: {
            terms: {
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
            },
          },
        },
      });

      // @ts-ignore
      return parseAggs(claimOverview.aggregations, runOverview.aggregations);
    } catch (err) {
      this.opts.logger.info(`error searching event log for task manager events: ${err.message}`);
      throw err;
    }
  }
}
