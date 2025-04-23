/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { AnalyticsIndexFactory } from './index_factory';
import { CAI_CASES_INDEX_MAPPINGS } from '../mappings';
import { CAI_CASES_INDEX_NAME, CAI_CASES_SOURCE_INDEX, CAI_CASES_SOURCE_QUERY } from '../constants';
import { CAI_CASES_INDEX_SCRIPT, CAI_CASES_INDEX_SCRIPT_ID } from '../painless_scripts';
import { scheduleCAIBackfillTask } from '../tasks/backfill_task';

interface CasesAnalyticsIndexFactoryParams {
  logger: Logger;
  esClient: ElasticsearchClient;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}

export class CasesAnalyticsIndexFactory extends AnalyticsIndexFactory {
  private taskManager: TaskManagerStartContract;

  constructor({ logger, esClient, isServerless, taskManager }: CasesAnalyticsIndexFactoryParams) {
    super({
      logger,
      esClient,
      isServerless,
      indexName: CAI_CASES_INDEX_NAME,
      mappings: CAI_CASES_INDEX_MAPPINGS,
      painlessScriptId: CAI_CASES_INDEX_SCRIPT_ID,
      painlessScript: CAI_CASES_INDEX_SCRIPT,
    });
    this.taskManager = taskManager;
  }

  protected async scheduleBackfillTask() {
    await scheduleCAIBackfillTask({
      taskId: 'cai_cases_backfill_task',
      sourceIndex: CAI_CASES_SOURCE_INDEX,
      sourceQuery: CAI_CASES_SOURCE_QUERY,
      destIndex: this.indexName,
      taskManager: this.taskManager,
      logger: this.logger,
    });
  }
}
