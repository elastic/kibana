/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract, ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeRegistry } from './sml_type_registry';
import type { SmlIndexAction, SmlContext } from './types';
import { createSmlStorage, smlIndexName } from './sml_storage';
import { isNotFoundError } from './sml_service';

export interface SmlIndexerDeps {
  registry: SmlTypeRegistry;
  logger: Logger;
}

export interface SmlIndexer {
  /**
   * Index, update, or delete SML data for a specific attachment.
   */
  indexAttachment: (params: {
    attachmentId: string;
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
    attachmentId,
    attachmentType,
    action,
    spaces,
    esClient,
    savedObjectsClient,
    logger: contextLogger,
  }: {
    attachmentId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    logger: Logger;
  }): Promise<void> {
    this.logger.info(
      `SML indexer: indexAttachment called — id='${attachmentId}', type='${attachmentType}', action='${action}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      this.logger.warn(
        `SML indexer: type definition '${attachmentType}' not found — skipping indexing for '${attachmentId}'. Registered types: [${this.registry
          .list()
          .map((t) => t.id)
          .join(', ')}]`
      );
      return;
    }

    if (action === 'delete') {
      this.logger.info(`SML indexer: deleting chunks for attachment '${attachmentId}'`);
      await this.deleteChunks({ attachmentId, esClient });
      return;
    }

    const context: SmlContext = {
      esClient,
      savedObjectsClient,
      logger: contextLogger,
    };

    this.logger.info(
      `SML indexer: calling getSmlData for attachment '${attachmentId}' of type '${attachmentType}'`
    );
    const smlData = await definition.getSmlData(attachmentId, context);
    if (!smlData || smlData.chunks.length === 0) {
      this.logger.info(
        `SML indexer: no SML data returned for attachment '${attachmentId}' of type '${attachmentType}' — deleting existing chunks`
      );
      await this.deleteChunks({ attachmentId, esClient });
      return;
    }

    this.logger.info(
      `SML indexer: getSmlData returned ${
        smlData.chunks.length
      } chunk(s) for attachment '${attachmentId}'. First chunk title: '${
        smlData.chunks[0]?.title
      }', content length: ${smlData.chunks[0]?.content?.length ?? 0}`
    );

    await this.deleteChunks({ attachmentId, esClient });

    const storage = createSmlStorage({ logger: this.logger, esClient });
    const smlClient = storage.getClient();

    const now = new Date().toISOString();
    const bulkOps = smlData.chunks.map((chunk) => {
      const chunkId = `${attachmentType}:${attachmentId}:${uuidv4()}`;
      return {
        index: {
          _id: chunkId,
          document: {
            id: chunkId,
            type: chunk.type,
            title: chunk.title,
            attachment_reference_id: attachmentId,
            content: chunk.content,
            created_at: now,
            updated_at: now,
            spaces,
            permissions: chunk.permissions ?? [],
          },
        },
      };
    });

    if (bulkOps.length > 0) {
      this.logger.info(
        `SML indexer: writing ${bulkOps.length} chunk(s) to index '${smlIndexName}' for attachment '${attachmentId}'`
      );
      try {
        const response = await smlClient.bulk({
          refresh: 'wait_for',
          operations: bulkOps,
        });

        if (response.errors) {
          const errorItems = response.items.filter((item) => item.index?.error);
          this.logger.error(
            `SML indexer: bulk index errors for '${attachmentId}': ${JSON.stringify(
              errorItems.slice(0, 3)
            )}`
          );
        } else {
          this.logger.info(
            `SML indexer: successfully indexed ${smlData.chunks.length} chunk(s) for attachment '${attachmentId}'`
          );
        }
      } catch (error) {
        this.logger.error(
          `SML indexer: failed to index SML data for attachment '${attachmentId}': ${
            (error as Error).message
          }`
        );
        throw error;
      }
    }
  }

  /**
   * Delete all SML chunks for a given attachment.
   * Uses `ignore_unavailable` and `allow_no_indices` so this is safe
   * even before the index has been created.
   */
  private async deleteChunks({
    attachmentId,
    esClient,
  }: {
    attachmentId: string;
    esClient: ElasticsearchClient;
  }): Promise<void> {
    try {
      this.logger.debug(
        `SML indexer: deleting existing chunks for attachment '${attachmentId}' from index '${smlIndexName}'`
      );
      const result = await esClient.deleteByQuery({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          term: { attachment_reference_id: attachmentId },
        },
        refresh: false,
      });
      if (result.deleted && result.deleted > 0) {
        this.logger.info(
          `SML indexer: deleted ${result.deleted} existing chunk(s) for attachment '${attachmentId}'`
        );
      }
    } catch (error) {
      // Silently ignore index-not-found — nothing to delete.
      if (isNotFoundError(error)) {
        this.logger.debug(
          `SML indexer: index '${smlIndexName}' not found — nothing to delete for '${attachmentId}'`
        );
        return;
      }
      this.logger.warn(
        `SML indexer: failed to delete chunks for attachment '${attachmentId}': ${
          (error as Error).message
        }`
      );
    }
  }
}

