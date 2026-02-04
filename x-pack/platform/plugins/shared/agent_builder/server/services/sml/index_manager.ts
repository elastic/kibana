/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { smlIndexAlias, smlIndexPrefix, smlWriteAlias } from './constants';
import { getSmlIndexMappings } from './mappings';
import { pickEmbeddingInferenceId } from './utils';
import type { CrawlerStateService } from './crawler_state_service';

const isMappingCompatible = (
  currentMappings: Record<string, unknown>,
  expectedMappings: Record<string, unknown>
): boolean => {
  const currentProps =
    (currentMappings as { properties?: Record<string, unknown> }).properties ?? {};
  const expectedProps =
    (expectedMappings as { properties?: Record<string, unknown> }).properties ?? {};

  return Object.keys(expectedProps).every((key) => {
    const current = currentProps[key] as { type?: string } | undefined;
    const expected = expectedProps[key] as { type?: string } | undefined;
    return current?.type === expected?.type;
  });
};

export class SmlIndexManager {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly crawlerState: CrawlerStateService
  ) {}

  async ensureIndex(): Promise<{ indexName: string; inferenceId: string }> {
    const inferenceId = await pickEmbeddingInferenceId({
      esClient: this.esClient,
      logger: this.logger,
    });
    const mappings = getSmlIndexMappings(inferenceId);

    const aliasExists = await this.esClient.indices.existsAlias({ name: smlIndexAlias });
    if (!aliasExists) {
      const indexName = `${smlIndexPrefix}${Date.now()}`;
      await this.createIndex(indexName, mappings);
      await this.esClient.indices.updateAliases({
        actions: [
          { add: { index: indexName, alias: smlIndexAlias } },
          { add: { index: indexName, alias: smlWriteAlias, is_write_index: true } },
        ],
      });

      return { indexName, inferenceId };
    }

    const aliasInfo = await this.esClient.indices.getAlias({ name: smlIndexAlias });
    const indexName = Object.keys(aliasInfo)[0];

    const currentMappingsResponse = await this.esClient.indices.getMapping({ index: indexName });
    const currentMappings = currentMappingsResponse[indexName]?.mappings ?? {};

    if (!isMappingCompatible(currentMappings, mappings)) {
      this.logger.warn(
        `SML mappings incompatible for "${indexName}". Creating a fresh index and resetting crawler state.`
      );
      const newIndexName = `${smlIndexPrefix}${Date.now()}`;
      await this.createIndex(newIndexName, mappings);
      await this.esClient.indices.updateAliases({
        actions: [
          { remove: { index: indexName, alias: smlIndexAlias } },
          { remove: { index: indexName, alias: smlWriteAlias } },
          { add: { index: newIndexName, alias: smlIndexAlias } },
          { add: { index: newIndexName, alias: smlWriteAlias, is_write_index: true } },
        ],
      });
      await this.crawlerState.resetIndex();
      return { indexName: newIndexName, inferenceId };
    }

    return { indexName, inferenceId };
  }

  private async createIndex(indexName: string, mappings: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Creating SML index "${indexName}"`);
    await this.esClient.indices.create({
      index: indexName,
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
      },
      mappings,
    });
  }
}
