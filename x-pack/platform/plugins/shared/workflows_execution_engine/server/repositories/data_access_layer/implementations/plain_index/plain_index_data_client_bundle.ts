/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import {
  createOrUpdateIndex,
  isRetryableIndexInitializationError,
  isUnknownResourceError,
} from './helpers';
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
const INDEX_INITIALIZATION_STOPPED_MESSAGE = 'Index initialization stopped';

export class PlainIndexDataClientBundle implements DataClientBundle {
  private esClient!: ElasticsearchClient;
  private readonly stopSignal: Promise<void>;
  private resolveStop?: () => void;

  constructor(private readonly deps: CreateDataClientDeps) {
    this.stopSignal = new Promise((resolve) => {
      this.resolveStop = resolve;
    });
  }

  async initSetup(_coreSetup: CoreSetup): Promise<void> {}

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.esClient = await this.init(esClient, this.deps.logger);
  }

  async stop(): Promise<void> {
    this.resolveStop?.();
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
    let unknownResourceDeadline: number | undefined;
    let lastUnknownResourceError: Error | undefined;

    while (true) {
      const remainingTime =
        unknownResourceDeadline === undefined ? undefined : unknownResourceDeadline - Date.now();
      if (remainingTime !== undefined && remainingTime <= 0 && lastUnknownResourceError) {
        logger.error('Failed to initialize workflow execution indices', {
          error: lastUnknownResourceError,
        });
        throw lastUnknownResourceError;
      }

      const attemptPromise = Promise.race([
        Promise.allSettled([
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
        ]),
        this.stopSignal.then(() => {
          throw new Error(INDEX_INITIALIZATION_STOPPED_MESSAGE);
        }),
      ]);

      const outcome =
        remainingTime === undefined
          ? { timedout: false as const, value: await attemptPromise }
          : await withTimeout({ promise: attemptPromise, timeoutMs: remainingTime });

      if (outcome.timedout) {
        const error =
          lastUnknownResourceError ??
          new Error('Workflow execution index initialization timed out');
        logger.error('Failed to initialize workflow execution indices', { error });
        throw error;
      }

      const errors = outcome.value.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : []
      );
      if (errors.length === 0) {
        return esClient;
      }

      const terminalError = errors.find((error) => !isRetryableIndexInitializationError(error));
      if (terminalError) {
        logger.error('Failed to initialize workflow execution indices', { error: terminalError });
        throw terminalError;
      }

      if (errors.every(isUnknownResourceError)) {
        unknownResourceDeadline ??= Date.now() + INDEX_INITIALIZATION_TIMEOUT_MS;
        lastUnknownResourceError = errors[0];
      } else {
        unknownResourceDeadline = undefined;
        lastUnknownResourceError = undefined;
      }

      attempt++;
      const retryDelay = Math.min(1000 * Math.pow(2, attempt), 30_000);
      const delay = unknownResourceDeadline
        ? Math.min(retryDelay, Math.max(0, unknownResourceDeadline - Date.now()))
        : retryDelay;
      logger.warn(`Transient error during index init, retrying in ${delay}ms`, {
        error: errors[0],
      });
      await this.waitForRetry(delay);
    }
  }

  private async waitForRetry(ms: number): Promise<void> {
    const outcome = await withTimeout({ promise: this.stopSignal, timeoutMs: ms, unref: true });
    if (!outcome.timedout) {
      throw new Error(INDEX_INITIALIZATION_STOPPED_MESSAGE);
    }
  }
}
