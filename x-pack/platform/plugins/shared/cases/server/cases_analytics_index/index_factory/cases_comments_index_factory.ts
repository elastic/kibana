/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { AnalyticsIndexFactory } from './index_factory';
import { CAI_COMMENTS_INDEX_MAPPINGS } from '../mappings';
import {
  CAI_COMMENTS_INDEX_NAME,
  CAI_COMMENTS_SOURCE_INDEX,
  CAI_COMMENTS_SOURCE_QUERY,
} from '../constants';
import { CAI_COMMENTS_INDEX_SCRIPT, CAI_COMMENTS_INDEX_SCRIPT_ID } from '../painless_scripts';
import { scheduleCAIBackfillTask } from '../tasks/backfill_task';

interface CasesCommentsAnalyticsIndexFactoryParams {
  logger: Logger;
  esClient: ElasticsearchClient;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}

export class CasesCommentsAnalyticsIndexFactory extends AnalyticsIndexFactory {
  private taskManager: TaskManagerStartContract;

  constructor({
    logger,
    esClient,
    isServerless,
    taskManager,
  }: CasesCommentsAnalyticsIndexFactoryParams) {
    super({
      logger,
      esClient,
      isServerless,
      indexName: CAI_COMMENTS_INDEX_NAME,
      mappings: CAI_COMMENTS_INDEX_MAPPINGS,
      painlessScriptId: CAI_COMMENTS_INDEX_SCRIPT_ID,
      painlessScript: CAI_COMMENTS_INDEX_SCRIPT,
    });
    this.taskManager = taskManager;
  }

  protected async scheduleBackfillTask() {
    await scheduleCAIBackfillTask({
      taskId: 'cai_comments_backfill_task',
      sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
      sourceQuery: CAI_COMMENTS_SOURCE_QUERY,
      destIndex: this.indexName,
      logger: this.logger,
      taskManager: this.taskManager,
    });
  }
}
