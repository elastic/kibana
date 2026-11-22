/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { createOrUpdateIndex, isUnknownResourceError } from './helpers';
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
  private readonly retryController = new AbortController();

  constructor(private readonly deps: CreateDataClientDeps) {}

  async initSetup(_coreSetup: CoreSetup): Promise<void> {}

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.esClient = await this.init(esClient);
  }

  async stop(): Promise<void> {
    this.retryController.abort(new Error('Index initialization stopped'));
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

  private async init(esClient: ElasticsearchClient): Promise<ElasticsearchClient> {
    try {
      await rejectOnAbort(
        Promise.all([
          this.initIndex(esClient, WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS),
          this.initIndex(
            esClient,
            WORKFLOWS_STEP_EXECUTIONS_INDEX,
            WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS
          ),
        ]),
        this.retryController.signal
      );
      return esClient;
    } catch (error) {
      this.retryController.abort(error);
      throw error;
    }
  }

  private async initIndex(
    esClient: ElasticsearchClient,
    indexName: string,
    mappings: MappingTypeMapping
  ): Promise<void> {
    const { logger } = this.deps;
    const { signal } = this.retryController;
    let unknownResourceDeadline = Infinity;

    for (let attempt = 1; ; attempt++) {
      try {
        await createOrUpdateIndex({ esClient, indexName, mappings, logger });
        return;
      } catch (error) {
        const isUnknownResource = isUnknownResourceError(error);
        if (!isUnknownResource && !isRetryableEsClientError(error)) {
          throw error;
        }
        unknownResourceDeadline = isUnknownResource
          ? Math.min(unknownResourceDeadline, Date.now() + INDEX_INITIALIZATION_TIMEOUT_MS)
          : Infinity;
        const remainingTime = unknownResourceDeadline - Date.now();
        if (remainingTime <= 0) {
          throw error;
        }
        const ms = Math.min(1000 * Math.pow(2, attempt), 30_000, remainingTime);
        logger.warn(`Transient error during ${indexName} init, retrying in ${ms}ms`, { error });
        await new Promise((resolve) => setTimeout(resolve, ms));
        signal.throwIfAborted();
      }
    }
  }
}

const rejectOnAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
