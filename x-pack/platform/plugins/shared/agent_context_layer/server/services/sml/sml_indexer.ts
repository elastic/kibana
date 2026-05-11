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
import type { SmlChunk, SmlIndexAction, SmlContext, SmlDocument, SmlDocumentSource } from './types';
import { createSmlStorage, smlIndexName } from './sml_storage';
import { isNotFoundError } from './sml_service';

export interface SmlIndexerDeps {
  registry: SmlTypeRegistry;
  logger: Logger;
}

export interface SmlIndexer {
  /**
   * Index, update, or delete SML data for a specific item.
   *
   * The operation runs in one of two modes:
   *  - **`direct`**: caller supplies `chunks` (or sets `source: 'direct'`
   *    explicitly). The indexer wipes any pre-existing chunks for `originId`
   *    (regardless of source) and writes the supplied chunks tagged with
   *    `source: 'direct'`. For `action: 'delete'` all chunks for the origin
   *    are wiped.
   *  - **`resolved`**: caller omits `chunks` (or sets `source: 'resolved'`).
   *    The indexer looks up the registered type, calls its `getSmlData(originId)`
   *    hook, and writes the result tagged with `source: 'resolved'`. If chunks
   *    tagged `source: 'direct'` already exist for this origin, the operation
   *    is **skipped** to preserve the user's override. The same protection
   *    applies to `action: 'delete'` in resolved mode.
   *
   * `source` is inferred when not provided: `'direct'` if `chunks` is set,
   * otherwise `'resolved'`.
   *
   * Per-`originId` invariant: the index never holds both `resolved` and
   * `direct` chunks at the same time.
   */
  indexAttachment: (params: {
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    logger: Logger;
    /** Pre-computed chunks (direct mode for `create`/`update`). */
    chunks?: SmlChunk[];
    /** Explicit source; defaults to inferred (direct if chunks else resolved). */
    source?: SmlDocumentSource;
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
    chunks: directChunks,
    source: explicitSource,
  }: {
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    logger: Logger;
    chunks?: SmlChunk[];
    source?: SmlDocumentSource;
  }): Promise<void> {
    const source: SmlDocumentSource =
      explicitSource ?? (directChunks !== undefined ? 'direct' : 'resolved');
    this.logger.info(
      `SML indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', source='${source}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    if (action === 'delete') {
      if (source === 'resolved') {
        const hasDirect = await this.hasDirectChunks({ originId, esClient });
        if (hasDirect) {
          this.logger.info(
            `SML indexer: skipping resolved-mode delete for origin '${originId}' — direct chunks exist and take precedence`
          );
          return;
        }
      }
      this.logger.info(`SML indexer: deleting chunks for origin '${originId}'`);
      await this.deleteChunks({ originId, esClient });
      return;
    }

    let chunks: SmlChunk[];
    if (source === 'direct') {
      if (directChunks === undefined) {
        this.logger.warn(
          `SML indexer: source='direct' but no chunks supplied for origin '${originId}' — treating as delete`
        );
        await this.deleteChunks({ originId, esClient });
        return;
      }
      if (directChunks.length === 0) {
        this.logger.info(
          `SML indexer: direct mode received empty chunks for origin '${originId}' — deleting existing chunks`
        );
        await this.deleteChunks({ originId, esClient });
        return;
      }
      chunks = directChunks;
      this.logger.info(
        `SML indexer: direct mode — using ${chunks.length} caller-supplied chunk(s) for origin '${originId}' (will override any existing chunks)`
      );
    } else {
      const hasDirect = await this.hasDirectChunks({ originId, esClient });
      if (hasDirect) {
        this.logger.info(
          `SML indexer: skipping resolved-mode index for origin '${originId}' — direct chunks exist and take precedence`
        );
        return;
      }

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
      chunks = smlData.chunks;
    }

    this.logger.info(
      `SML indexer: indexing ${
        chunks.length
      } chunk(s) for origin '${originId}' (source='${source}'). First chunk title: '${
        chunks[0]?.title
      }', content length: ${chunks[0]?.content?.length ?? 0}`
    );

    await this.deleteChunks({ originId, esClient });

    const storage = createSmlStorage({ logger: this.logger, esClient });
    const smlClient = storage.getClient();

    const now = new Date().toISOString();
    const bulkOps = chunks.map((chunk) => {
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
        source,
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
            `SML indexer: successfully indexed ${chunks.length} chunk(s) for origin '${originId}'`
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
   * Check whether any chunks tagged `source: 'direct'` exist for the given
   * `originId`. Used to enforce the per-origin mutual-exclusion invariant:
   * resolved writes are skipped when direct chunks exist.
   *
   * Safe to call before the index has been created.
   */
  private async hasDirectChunks({
    originId,
    esClient,
  }: {
    originId: string;
    esClient: ElasticsearchClient;
  }): Promise<boolean> {
    try {
      const result = await esClient.count({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            filter: [{ term: { origin_id: originId } }, { term: { source: 'direct' } }],
          },
        },
      });
      return (result.count ?? 0) > 0;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      this.logger.warn(
        `SML indexer: failed to check for direct chunks for origin '${originId}': ${
          (error as Error).message
        }`
      );
      // Fail open: treat as no direct chunks rather than blocking the
      // resolved-mode write. The next direct write will re-establish the
      // override.
      return false;
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
