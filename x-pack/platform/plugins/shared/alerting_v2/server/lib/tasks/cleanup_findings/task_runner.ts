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
import { RULE_DOCTOR_FINDINGS_INDEX } from '../../../resources/indices/rule_doctor_findings';
import type { LatestTaskStateSchema } from './task_state';
import {
  CLEANUP_FINDINGS_TASK_INTERVAL,
  CLEANUP_FINDINGS_RETENTION_DAYS,
} from './task_definition';

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class FindingsCleanupTaskRunner {
  constructor(
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient
  ) {}

  public async run({ taskInstance }: TaskRunParams): Promise<RunResult> {
    const state = taskInstance.state as LatestTaskStateSchema;
    let deleted = 0;

    try {
      const response = await this.esClient.deleteByQuery({
        index: RULE_DOCTOR_FINDINGS_INDEX,
        query: {
          bool: {
            filter: [
              { terms: { status: ['dismissed', 'applied'] } },
              { range: { '@timestamp': { lt: `now-${CLEANUP_FINDINGS_RETENTION_DAYS}d` } } },
            ],
          },
        },
        refresh: true,
      });

      deleted = response.deleted ?? 0;

      if (deleted > 0) {
        this.logger.info(`Cleaned up ${deleted} stale findings from ${RULE_DOCTOR_FINDINGS_INDEX}`);
      } else {
        this.logger.debug('No stale findings to clean up');
      }
    } catch (e) {
      this.logger.error(
        `Error executing findings cleanup task: ${(e as Error).message}`,
        { error: { stack_trace: (e as Error).stack } }
      );
    }

    return {
      state: {
        runs: (state.runs || 0) + 1,
        total_deleted: (state.total_deleted || 0) + deleted,
      },
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
    };
  }
}
