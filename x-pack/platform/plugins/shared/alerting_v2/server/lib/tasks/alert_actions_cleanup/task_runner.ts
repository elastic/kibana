/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, PluginInitializerContext } from '@kbn/core/server';
import { PluginInitializer } from '@kbn/core-di-server';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { throwRetryableError } from '@kbn/task-manager-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { inject, injectable } from 'inversify';
import type { PluginConfig } from '../../../config';
import { parseDurationToMs } from '../../duration';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import type { AlertingTaskRunner } from '../../services/task_run_scope_service/create_task_runner';
import {
  ALERT_ACTIONS_CLEANUP_TASK_INTERVAL,
  ALERT_ACTIONS_CLEANUP_TASK_TIMEOUT,
  DISPATCHER_ACTION_TYPES,
} from './constants';

type TaskRunParams = Pick<RunContext, 'signal'>;

@injectable()
export class AlertActionsCleanupTaskRunner implements AlertingTaskRunner {
  private readonly config: PluginConfig;

  constructor(
    @inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.config = pluginConfigAccessor.get<PluginConfig>();
  }

  public async run({ signal }: TaskRunParams): Promise<RunResult> {
    const { dataRetention } = this.config.retention.alertActions.dispatcher;
    const cutoff = new Date(Date.now() - parseDurationToMs(dataRetention)).toISOString();

    try {
      await this.esClient.deleteByQuery(
        {
          index: ALERT_ACTIONS_DATA_STREAM,
          ignore_unavailable: true,
          conflicts: 'proceed',
          slices: 'auto',
          query: {
            bool: {
              filter: [
                { terms: { action_type: DISPATCHER_ACTION_TYPES } },
                { range: { '@timestamp': { lt: cutoff } } },
              ],
            },
          },
        },
        { signal, requestTimeout: ALERT_ACTIONS_CLEANUP_TASK_TIMEOUT }
      );
    } catch (error) {
      throwRetryableError(error, true);
    }

    return { state: {}, schedule: { interval: ALERT_ACTIONS_CLEANUP_TASK_INTERVAL } };
  }
}
