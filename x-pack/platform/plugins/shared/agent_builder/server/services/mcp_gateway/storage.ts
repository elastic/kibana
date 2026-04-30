/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { McpGatewayConfig } from '@kbn/agent-builder-common';
import { chatSystemIndex } from '@kbn/agent-builder-server';

const INDEX_NAME = chatSystemIndex('mcp-gateway-config');

const DEFAULT_CONFIG: McpGatewayConfig = {
  enabled: false,
  connectors: [],
};

export class McpGatewayConfigStorage {
  private ensureIndexPromise: Promise<void> | undefined;

  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  private ensureIndex(): Promise<void> {
    if (!this.ensureIndexPromise) {
      this.ensureIndexPromise = this.createIndex().catch((error) => {
        // Reset so the next call retries
        this.ensureIndexPromise = undefined;
        throw error;
      });
    }
    return this.ensureIndexPromise;
  }

  private async createIndex(): Promise<void> {
    try {
      await this.esClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            dynamic: false,
            properties: {
              enabled: { type: 'boolean' },
              connectors: {
                type: 'nested',
                properties: {
                  connectorId: { type: 'keyword' },
                  connectorSlug: { type: 'keyword' },
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (
        isResponseError(error) &&
        error.body?.error?.type === 'resource_already_exists_exception'
      ) {
        return;
      }
      this.logger.warn(`Failed to create MCP gateway config index: ${error}`);
      throw error;
    }
  }

  async getConfig(spaceId: string): Promise<McpGatewayConfig> {
    await this.ensureIndex();
    try {
      const result = await this.esClient.get<McpGatewayConfig>({
        index: INDEX_NAME,
        id: spaceId,
      });
      return result._source ?? DEFAULT_CONFIG;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return { ...DEFAULT_CONFIG };
      }
      throw error;
    }
  }

  async updateConfig(spaceId: string, config: McpGatewayConfig): Promise<void> {
    await this.ensureIndex();
    await this.esClient.index({
      index: INDEX_NAME,
      id: spaceId,
      document: config,
      refresh: 'wait_for',
    });
  }
}
