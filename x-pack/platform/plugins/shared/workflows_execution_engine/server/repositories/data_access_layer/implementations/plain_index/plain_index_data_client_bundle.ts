/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { createOrUpdateIndex, isRetryableIndexInitializationError } from './helpers';
import { PlainIndexDataClient } from './plain_index_data_client';
import { createRetryingEsClient } from '../../../../lib/create_retrying_es_client';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../mappings/workflow_executions_mappings';
import type {
  CreateDataClientDeps,
  DataClientBundle,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../../types';

const INDEX_INITIALIZATION_TIMEOUT_MS = 20 * 60 * 1000;

export class PlainIndexDataClientBundle implements DataClientBundle {
  private esClient!: ElasticsearchClient;
  private stopped = false;
  private finishRetryDelay?: () => void;

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(_coreSetup: CoreSetup): Promise<void> {}

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.esClient = await this.init(esClient, this.deps.logger);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.finishRetryDelay?.();
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return new PlainIndexDataClient<EsWorkflowExecution>({
      esClient: this.esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_EXECUTIONS_INDEX,
    });
  }

  createStepDataClient(): StepExecutionsDataClient {
    return new PlainIndexDataClient<EsWorkflowStepExecution>({
      esClient: this.esClient,
      logger: this.deps.logger,
      indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    });
  }

  private async init(esClient: ElasticsearchClient, logger: Logger): Promise<ElasticsearchClient> {
    let attempt = 0;
    const startedAt = Date.now();

    while (!this.stopped) {
      try {
        await Promise.all([
          createOrUpdateIndex({
            esClient,
            indexName: WORKFLOWS_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
            logger,
          }),
          createOrUpdateIndex({
            esClient,
            indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
            logger,
          }),
        ]);
        return esClient;
      } catch (error) {
        if (this.stopped) {
          break;
        }

        if (!isRetryableIndexInitializationError(error)) {
          throw error;
        }
        if (Date.now() - startedAt >= INDEX_INITIALIZATION_TIMEOUT_MS) {
          logger.error('Failed to initialize workflow execution indices', { error });
          throw error;
        }
        attempt++;
        const ms = Math.min(1000 * Math.pow(2, attempt), 30_000);
        logger.warn(`Transient error during index init, retrying in ${ms}ms`, { error });
        await this.waitForRetry(ms);
      }
    }
    return esClient;
  }

  private async waitForRetry(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, ms);
      this.finishRetryDelay = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
    this.finishRetryDelay = undefined;
  }
}
