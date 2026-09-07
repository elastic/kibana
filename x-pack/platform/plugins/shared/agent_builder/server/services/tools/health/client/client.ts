/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createInternalError } from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { ToolHealthStorage } from './storage';
import { createStorage } from './storage';
import { fromEs } from './converters';
import type { ToolHealthState, ToolHealthDocument, ToolHealthUpdateParams } from './types';

/**
 * Client for managing tool health state.
 *
 * Note: This client is primarily used in fire-and-forget mode from the tool registry.
 * Errors are caught and wrapped with context for debugging, but callers using
 * fire-and-forget patterns should catch and ignore errors to avoid blocking tool execution.
 */
export interface ToolHealthClient {
  /**
   * Get health state for a specific tool.
   */
  get(toolId: string): Promise<ToolHealthState | undefined>;

  /**
   * Create or update health state for a tool.
   */
  upsert(toolId: string, params: ToolHealthUpdateParams): Promise<ToolHealthState>;

  /**
   * Delete health state for a tool.
   * Returns true if deleted, false if not found or on error.
   * This method is designed for fire-and-forget cleanup and will not throw.
   */
  delete(toolId: string): Promise<boolean>;

  /**
   * List all health states for the current space.
   */
  listBySpace(): Promise<ToolHealthState[]>;

  /**
   * Record a successful health check for a tool.
   */
  recordSuccess(toolId: string): Promise<ToolHealthState>;

  /**
   * Record a failed health check for a tool.
   */
  recordFailure(toolId: string, errorMessage: string): Promise<ToolHealthState>;
}

export const createClient = ({
  space,
  logger,
  esClient,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolHealthClient => {
  const storage = createStorage({ logger, esClient });
  return new ToolHealthClientImpl({ space, storage, logger });
};

class ToolHealthClientImpl implements ToolHealthClient {
  private readonly space: string;
  private readonly storage: ToolHealthStorage;
  private readonly logger: Logger;

  constructor({
    space,
    storage,
    logger,
  }: {
    space: string;
    storage: ToolHealthStorage;
    logger: Logger;
  }) {
    this.space = space;
    this.storage = storage;
    this.logger = logger;
  }

  async get(toolId: string): Promise<ToolHealthState | undefined> {
    try {
      const response = await this.storage.getClient().search({
        track_total_hits: false,
        size: 1,
        terminate_after: 1,
        query: {
          bool: {
            filter: [createSpaceDslFilter(this.space), { term: { tool_id: toolId } }],
          },
        },
      });

      const hit = response.hits.hits[0];
      if (!hit?._source) return undefined;

      return fromEs(hit as ToolHealthDocument);
    } catch (error) {
      this.logger.error(`Failed to get health state for tool ${toolId}: ${error}`);
      throw createInternalError(`Failed to get health state for tool ${toolId}`, {
        toolId,
        space: this.space,
        cause: error,
      });
    }
  }

  async upsert(toolId: string, params: ToolHealthUpdateParams): Promise<ToolHealthState> {
    try {
      const existing = await this.get(toolId);
      const now = new Date().toISOString();

      const document = {
        tool_id: toolId,
        space: this.space,
        status: params.status,
        last_check: params.lastCheck ?? now,
        error_message: params.errorMessage ?? '',
        consecutive_failures: params.consecutiveFailures ?? existing?.consecutiveFailures ?? 0,
        updated_at: now,
      };

      // Use tool_id + space as a deterministic document ID
      const docId = `${this.space}:${toolId}`;

      await this.storage.getClient().index({
        id: docId,
        document,
      });

      this.logger.debug(`Updated health state for tool ${toolId}: ${params.status}`);

      return {
        toolId,
        status: params.status,
        lastCheck: document.last_check,
        errorMessage: params.errorMessage,
        consecutiveFailures: document.consecutive_failures,
      };
    } catch (error) {
      // Don't re-wrap if already an internal error (from get() call)
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      this.logger.error(`Failed to upsert health state for tool ${toolId}: ${error}`);
      throw createInternalError(`Failed to upsert health state for tool ${toolId}`, {
        toolId,
        space: this.space,
        status: params.status,
        cause: error,
      });
    }
  }

  async delete(toolId: string): Promise<boolean> {
    try {
      const docId = `${this.space}:${toolId}`;
      const result = await this.storage.getClient().delete({ id: docId });
      return result.result === 'deleted';
    } catch (error) {
      // Fire-and-forget friendly: log and return false instead of throwing
      this.logger.debug(`Failed to delete health state for tool ${toolId}: ${error}`);
      return false;
    }
  }

  async listBySpace(): Promise<ToolHealthState[]> {
    try {
      const response = await this.storage.getClient().search({
        size: 1000,
        track_total_hits: false,
        query: {
          bool: {
            filter: [createSpaceDslFilter(this.space)],
          },
        },
      });

      return response.hits.hits
        .filter((hit) => !!hit._source)
        .map((hit) => fromEs(hit as ToolHealthDocument));
    } catch (error) {
      this.logger.error(`Failed to list health states for space ${this.space}: ${error}`);
      throw createInternalError(`Failed to list health states for space ${this.space}`, {
        space: this.space,
        cause: error,
      });
    }
  }

  async recordSuccess(toolId: string): Promise<ToolHealthState> {
    return this.upsert(toolId, {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      errorMessage: undefined,
      consecutiveFailures: 0,
    });
  }

  async recordFailure(toolId: string, errorMessage: string): Promise<ToolHealthState> {
    const existing = await this.get(toolId);
    const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;

    return this.upsert(toolId, {
      status: 'failed',
      lastCheck: new Date().toISOString(),
      errorMessage,
      consecutiveFailures,
    });
  }
}
