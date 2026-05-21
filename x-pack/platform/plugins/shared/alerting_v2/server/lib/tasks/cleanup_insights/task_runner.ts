/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Logger as PluginLogger } from '@kbn/core-di';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import { RULE_DOCTOR_INSIGHTS_INDEX } from '../../../resources/indices/rule_doctor_insights';
import { CLEANUP_INSIGHTS_TASK_INTERVAL, CLEANUP_INSIGHTS_RETENTION_DAYS } from './task_definition';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class InsightsCleanupTaskRunner {
  constructor(
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public async run(_params: TaskRunParams): Promise<RunResult> {
    try {
      const response = await this.esClient.deleteByQuery({
        index: RULE_DOCTOR_INSIGHTS_INDEX,
        query: {
          bool: {
            filter: [
              { terms: { status: ['dismissed', 'applied'] } },
              { range: { '@timestamp': { lt: `now-${CLEANUP_INSIGHTS_RETENTION_DAYS}d` } } },
            ],
          },
        },
        conflicts: 'proceed',
        slices: 'auto',
      });

      const deleted = response.deleted ?? 0;

      if (deleted > 0) {
        this.logger.debug(
          `Cleaned up ${deleted} stale insights from ${RULE_DOCTOR_INSIGHTS_INDEX}`
        );
      } else {
        this.logger.debug('No stale insights to clean up');
      }
    } catch (e) {
      this.logger.error(`Error executing insights cleanup task: ${(e as Error).message}`, {
        error: { stack_trace: (e as Error).stack },
      });
    }

    return {
      state: {},
      schedule: { interval: CLEANUP_INSIGHTS_TASK_INTERVAL },
    };
  }
}
