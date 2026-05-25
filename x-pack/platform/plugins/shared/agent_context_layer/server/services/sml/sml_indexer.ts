/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeRegistry } from './sml_type_registry';
import type { SmlIndexAction, SmlContext, SmlDocument } from './types';
import { createSmlStorage, smlIndexName } from './sml_storage';
import { isNotFoundError } from './sml_service';

export interface SmlIndexerDeps {
  registry: SmlTypeRegistry;
  logger: Logger;
}

export interface SmlIndexer {
  /**
   * Index, update, or delete SML data for a specific item.
   */
  indexAttachment: (params: {
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    logger: Logger;
  }) => Promise<void>;
}

export const createSmlIndexer = ({ registry, logger }: SmlIndexerDeps): SmlIndexer => {
  return new SmlIndexerImpl({ registry, logger });
};

class SmlIndexerImpl implements SmlIndexer {
  private readonly registry: SmlTypeRegistry;
  private readonly logger: Logger;

  constructor({ registry, logger }: SmlIndexerDeps) {
    this.registry = registry;
    this.logger = logger;
  }

  async indexAttachment({
    originId,
    attachmentType,
    action,
    spaces,
    esClient,
    savedObjectsClient,
    logger: contextLogger,
  }: {
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    logger: Logger;
  }): Promise<void> {
    this.logger.info(
      `SML indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      this.logger.warn(
        `SML indexer: type definition '${attachmentType}' not found — skipping indexing for '${originId}'. Registered types: [${this.registry
          .list()
          .map((t) => t.id)
          .join(', ')}]`
      );
      return;
    }

    if (action === 'delete') {
      this.logger.info(`SML indexer: deleting chunks for origin '${originId}'`);
      await this.deleteChunks({ originId, esClient });
      return;
    }

    const context: SmlContext = {
      esClient,
      savedObjectsClient,
      logger: contextLogger,
    };

    this.logger.info(
      `SML indexer: calling getSmlData for origin '${originId}' of type '${attachmentType}'`
    );
    const smlData = await definition.getSmlData(originId, context);
    if (!smlData || smlData.chunks.length === 0) {
      this.logger.info(
        `SML indexer: no SML data returned for origin '${originId}' of type '${attachmentType}' — deleting existing chunks`
      );
      await this.deleteChunks({ originId, esClient });
      return;
    }

    this.logger.info(
      `SML indexer: getSmlData returned ${
        smlData.chunks.length
      } chunk(s) for origin '${originId}'. First chunk title: '${
        smlData.chunks[0]?.title
      }', content length: ${smlData.chunks[0]?.content?.length ?? 0}`
    );

    await this.deleteChunks({ originId, esClient });

    const storage = createSmlStorage({ logger: this.logger, esClient });
    const smlClient = storage.getClient();

    const now = new Date().toISOString();
    const bulkOps = smlData.chunks.map((chunk) => {
      const chunkId = `${attachmentType}:${originId}:${uuidv4()}`;
      const document: SmlDocument = {
        id: chunkId,
        type: chunk.type,
        title: chunk.title,
        origin_id: originId,
        content: chunk.content,
        created_at: now,
        updated_at: now,
        spaces,
        permissions: chunk.permissions ?? [],
      };
      if (chunk.description !== undefined) {
        document.description = chunk.description;
      }
      if (chunk.user_id !== undefined) {
        document.user_id = chunk.user_id;
      }
      if (chunk.references !== undefined) {
        document.references = chunk.references;
      }
      return {
        index: {
          _id: chunkId,
          document,
        },
      };
    });

    if (bulkOps.length > 0) {
      this.logger.info(
        `SML indexer: writing ${bulkOps.length} chunk(s) to index '${smlIndexName}' for origin '${originId}'`
      );
      try {
        const response = await smlClient.bulk({
          refresh: 'wait_for',
          operations: bulkOps,
        });

        if (response.errors) {
          const errorItems = response.items.filter((item) => item.index?.error);
          this.logger.error(
            `SML indexer: bulk index errors for '${originId}': ${JSON.stringify(
              errorItems.slice(0, 3)
            )}`
          );
        } else {
          this.logger.info(
            `SML indexer: successfully indexed ${smlData.chunks.length} chunk(s) for origin '${originId}'`
          );
        }
      } catch (error) {
        this.logger.error(
          `SML indexer: failed to index SML data for origin '${originId}': ${
            (error as Error).message
          }`
        );
        throw error;
      }
    }
  }

  /**
   * Delete all SML chunks for a given item.
   * Uses `ignore_unavailable` and `allow_no_indices` so this is safe
   * even before the index has been created.
   */
  private async deleteChunks({
    originId,
    esClient,
  }: {
    originId: string;
    esClient: ElasticsearchClient;
  }): Promise<void> {
    try {
      this.logger.debug(
        `SML indexer: deleting existing chunks for origin '${originId}' from index '${smlIndexName}'`
      );
      const result = await esClient.deleteByQuery({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          term: { origin_id: originId },
        },
        refresh: false,
      });
      if (result.deleted && result.deleted > 0) {
        this.logger.info(
          `SML indexer: deleted ${result.deleted} existing chunk(s) for origin '${originId}'`
        );
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        this.logger.debug(
          `SML indexer: index '${smlIndexName}' not found — nothing to delete for '${originId}'`
        );
        return;
      }
      this.logger.warn(
        `SML indexer: failed to delete chunks for origin '${originId}': ${(error as Error).message}`
      );
    }
  }
}
