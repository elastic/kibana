/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ElasticSearchSaver } from '../elastic-search-checkpoint-saver';
import {
  getCheckpointsIndexName,
  getCheckpointWritesIndexName,
  createCheckpointsStorage,
  createCheckpointWritesStorage,
} from './storage';

export interface CreateCheckpointerClientOptions {
  /**
   * Index name prefix for checkpoint indices.
   * Examples: '.chat-', '.observability-', '.security-'
   */
  indexPrefix: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}

/**
 * Creates an ElasticSearchSaver instance configured with the specified index prefix.
 * This factory function integrates the StorageIndexAdapter pattern with LangGraph's
 * checkpoint saver, ensuring indices are created with proper mappings on first write.
 *
 * @param options Configuration options including index prefix, logger, and ES client
 * @returns Configured ElasticSearchSaver instance
 *
 * @example
 * ```ts
 * const checkpointer = createCheckpointerClient({
 *   indexPrefix: '.chat-',
 *   logger,
 *   esClient,
 * });
 * ```
 */
export const createCheckpointerClient = ({
  indexPrefix,
  logger,
  esClient,
}: CreateCheckpointerClientOptions): ElasticSearchSaver => {
  // Create storage adapters for automatic index management
  const checkpointsStorage = createCheckpointsStorage({
    indexPrefix,
    logger,
    esClient,
  });

  const checkpointWritesStorage = createCheckpointWritesStorage({
    indexPrefix,
    logger,
    esClient,
  });

  return new ElasticSearchSaver({
    logger,
    checkpointIndex: getCheckpointsIndexName(indexPrefix),
    checkpointWritesIndex: getCheckpointWritesIndexName(indexPrefix),
    refreshPolicy: 'wait_for',
    checkpointsStorage: checkpointsStorage.getClient(),
    checkpointWritesStorage: checkpointWritesStorage.getClient(),
  });
};

