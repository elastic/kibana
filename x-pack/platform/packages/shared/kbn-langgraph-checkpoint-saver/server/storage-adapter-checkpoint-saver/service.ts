/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import type { ElasticSearchSaver } from '../elastic-search-checkpoint-saver';
import { createCheckpointerClient } from './client';

export interface CheckpointerServiceOptions {
  /**
   * Index name prefix for checkpoint indices.
   * Examples: '.chat-', '.observability-', '.security-'
   */
  indexPrefix: string;
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}

/**
 * Service interface for managing LangGraph checkpoints with Elasticsearch storage.
 */
export interface CheckpointerService {
  /**
   * Gets a scoped checkpointer instance for the given request.
   * The checkpointer will use the request's security context for ES operations.
   */
  getCheckpointer(options: { request: KibanaRequest }): Promise<ElasticSearchSaver>;
}

/**
 * Service implementation for managing LangGraph checkpoints with Elasticsearch storage.
 * This service handles scoping checkpoint storage to the request's security context.
 *
 * @example
 * ```ts
 * // In plugin setup
 * const checkpointerService = new CheckpointerServiceImpl({
 *   indexPrefix: '.chat-',
 *   logger: core.logger.get('checkpointer'),
 *   elasticsearch: core.elasticsearch,
 * });
 *
 * // In route handler
 * const checkpointer = await checkpointerService.getCheckpointer({ request });
 * ```
 */
export class CheckpointerServiceImpl implements CheckpointerService {
  private readonly indexPrefix: string;
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor({ indexPrefix, logger, elasticsearch }: CheckpointerServiceOptions) {
    this.indexPrefix = indexPrefix;
    this.logger = logger;
    this.elasticsearch = elasticsearch;
  }

  async getCheckpointer({ request }: { request: KibanaRequest }): Promise<ElasticSearchSaver> {
    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;

    return createCheckpointerClient({
      indexPrefix: this.indexPrefix,
      esClient,
      logger: this.logger,
    });
  }
}
