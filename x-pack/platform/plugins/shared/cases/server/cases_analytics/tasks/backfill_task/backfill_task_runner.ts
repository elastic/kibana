/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import {
  createTaskRunError,
  TaskErrorSource,
  throwRetryableError,
  throwUnrecoverableError,
  type ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type {
  IndicesGetMappingResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { Owner } from '../../../../common/constants/types';
import type { ConfigType } from '../../../config';
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../../common/types/configure';

interface BackfillTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
}

export class BackfillTaskRunner implements CancellableTask {
  private readonly sourceIndex: string;
  private readonly destIndex: string;
  private readonly sourceQuery: QueryDslQueryContainer;
  private readonly spaceId: string;
  private readonly owner: Owner;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly logger: Logger;
  private readonly errorSource = TaskErrorSource.FRAMEWORK;
  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    taskInstance,
    getESClient,
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
  }: BackfillTaskRunnerFactoryConstructorParams) {
    this.sourceIndex = taskInstance.params.sourceIndex;
    this.destIndex = taskInstance.params.destIndex;
    this.sourceQuery = taskInstance.params.sourceQuery;
    this.spaceId = taskInstance.params.spaceId;
    this.owner = taskInstance.params.owner;
    this.getESClient = getESClient;
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
  }

  public async run() {
    const executionId = uuidv4();
    const startMs = Date.now();

    if (!this.analyticsConfig.index.enabled) {
      this.logDebug('Analytics index is disabled, skipping backfill task.', executionId);
      return;
    }

    this.logger.info(`[backfill-task][${this.destIndex}] Starting backfill reindex`, {
      destIndex: this.destIndex,
      sourceIndex: this.sourceIndex,
      executionId,
      tags: ['cai-backfill', this.destIndex],
    });

    const esClient = await this.getESClient();
    try {
      await this.waitForDestIndex(esClient);
      await this.backfillReindex(esClient);

      this.logger.info(`[backfill-task][${this.destIndex}] Backfill reindex complete`, {
        destIndex: this.destIndex,
        executionId,
        durationMs: Date.now() - startMs,
        tags: ['cai-backfill', this.destIndex],
      });

      // Update analytics_last_sync_at so the UI reflects that data is available.
      // Best-effort: a failure here must not fail the task itself.
      if (this.spaceId && this.owner) {
        this.updateLastSyncAt(executionId).catch((err: Error) => {
          this.logger.warn(
            `[backfill-task][${this.destIndex}] Failed to update analytics_last_sync_at after backfill`,
            {
              destIndex: this.destIndex,
              executionId,
              error: err,
              tags: ['cai-backfill', this.destIndex],
            }
          );
        });
      }

      return {
        state: {},
      };
    } catch (e) {
      if (isRetryableEsClientError(e)) {
        this.logger.warn(`[backfill-task][${this.destIndex}] Transient ES error — will retry`, {
          destIndex: this.destIndex,
          executionId,
          error: e,
          tags: ['cai-backfill', 'cai-backfill-error', this.destIndex],
        });
        throwRetryableError(createTaskRunError(e, this.errorSource), true);
      }

      this.logger.error(`[backfill-task][${this.destIndex}] Backfill reindex failed`, {
        destIndex: this.destIndex,
        executionId,
        error: e,
        tags: ['cai-backfill', 'cai-backfill-error', this.destIndex],
      });
      throwUnrecoverableError(createTaskRunError(e, this.errorSource));
    }
  }

  public async cancel() {}

  private async backfillReindex(esClient: ElasticsearchClient) {
    const painlessScript = await this.getPainlessScript(esClient);

    if (painlessScript.found) {
      this.logDebug(`Reindexing from ${this.sourceIndex} to ${this.destIndex}.`);
      const painlessScriptId = await this.getPainlessScriptId(esClient);

      await esClient.reindex({
        source: {
          index: this.sourceIndex,
          query: this.sourceQuery,
        },
        dest: { index: this.destIndex },
        script: {
          id: painlessScriptId,
        },
        /** If `true`, the request refreshes affected shards to make this operation visible to search. */
        refresh: true,
        /** We do not wait for the es reindex operation to be completed. */
        wait_for_completion: false,
      });
    } else {
      throw createTaskRunError(
        new Error(this.getErrorMessage('Painless script not found.')),
        this.errorSource
      );
    }
  }

  private async updateLastSyncAt(executionId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const soClient = await this.getUnsecureSavedObjectsClient();

    const results = await soClient.find<ConfigurationPersistedAttributes>({
      type: CASE_CONFIGURE_SAVED_OBJECT,
      namespaces: [this.spaceId],
      filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${this.owner}"`,
      perPage: 1,
    });

    if (results.saved_objects.length === 0) {
      this.logger.debug(
        `[backfill-task][${this.destIndex}] No configure SO found for owner=${this.owner} spaceId=${this.spaceId}; skipping analytics_last_sync_at update`,
        { executionId, tags: ['cai-backfill', this.destIndex] }
      );
      return;
    }

    const so = results.saved_objects[0];
    await soClient.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      so.id,
      { analytics_last_sync_at: timestamp, analytics_sync_status: 'active' },
      { namespace: this.spaceId === 'default' ? undefined : this.spaceId }
    );

    this.logger.debug(
      `[backfill-task][${this.destIndex}] Updated analytics_last_sync_at to ${timestamp} and reset analytics_sync_status to active`,
      { executionId, tags: ['cai-backfill', this.destIndex] }
    );
  }

  private async getPainlessScript(esClient: ElasticsearchClient) {
    const painlessScriptId = await this.getPainlessScriptId(esClient);

    this.logDebug(`Getting painless script with id ${painlessScriptId}.`);
    return esClient.getScript({
      id: painlessScriptId,
    });
  }

  private async getPainlessScriptId(esClient: ElasticsearchClient): Promise<string> {
    const currentMapping = await this.getCurrentMapping(esClient);
    const painlessScriptId = currentMapping[this.destIndex].mappings._meta?.painless_script_id;

    if (!painlessScriptId) {
      throw createTaskRunError(
        new Error(this.getErrorMessage('Painless script id missing from mapping.')),
        this.errorSource
      );
    }

    return painlessScriptId;
  }

  private async getCurrentMapping(
    esClient: ElasticsearchClient
  ): Promise<IndicesGetMappingResponse> {
    this.logDebug('Getting index mapping.');
    return esClient.indices.getMapping({
      index: this.destIndex,
    });
  }

  private async waitForDestIndex(esClient: ElasticsearchClient) {
    this.logDebug('Checking index availability.');
    return esClient.cluster.health({
      index: this.destIndex,
      wait_for_status: 'green',
      timeout: '30s',
    });
  }

  public logDebug(message: string, executionId?: string) {
    this.logger.debug(`[${this.destIndex}] ${message}`, {
      ...(executionId ? { executionId } : {}),
      tags: ['cai-backfill', this.destIndex],
    });
  }

  public getErrorMessage(message: string) {
    const errorMessage = `[${this.destIndex}] Backfill reindex failed. Error: ${message}`;

    this.logger.error(errorMessage, {
      tags: ['cai-backfill', 'cai-backfill-error', this.destIndex],
    });

    return errorMessage;
  }
}
