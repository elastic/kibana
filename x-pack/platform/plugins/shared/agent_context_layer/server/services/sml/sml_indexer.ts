/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeRegistry } from './sml_type_registry';
import type {
  SmlContext,
  SmlDocument,
  SmlChunk,
  SmlDeleteScope,
  SmlIngestionMethod,
  SmlIndexerParams,
  SmlIndexerDeleteAttachmentParams,
} from './types';
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
   * In origin mode (no `content`), the indexer resolves the type's `getSmlData`
   * hook and writes the produced chunks tagged `ingestion_method: 'crawled'`.
   * If any existing chunks for this `origin_id` carry
   * `ingestion_method: 'manual'`, the call is a no-op unless `force: true` is
   * passed.
   *
   * In content mode (`content` provided), `getSmlData` is skipped and the
   * provided chunks are written directly, tagged `ingestion_method: 'manual'`.
   * The write always overwrites any existing chunks for the `origin_id`.
   *
   * For `action: 'delete'`, only chunks with `ingestion_method: 'crawled'` are
   * removed — manual entries for the same `origin_id` are preserved. This keeps
   * curated content around even when the upstream object goes away (e.g.
   * transient blip, or a curator pinning standalone context to a deleted
   * dashboard). Callers that need to wipe `'manual'` or `'all'` chunks should
   * use {@link SmlIndexer.deleteAttachment} instead.
   */
  indexAttachment: (params: SmlIndexerParams) => Promise<void>;

  /**
   * Delete chunks for an origin, with explicit control over which ingestion
   * method(s) are removed.
   *
   * The default scope (`'crawled'`) matches `indexAttachment({ action: 'delete' })`
   * for back-compat with the crawler and event-driven CRUD callers; pass
   * `'manual'` to wipe curated entries only, or `'all'` to fully retire the
   * origin (used by workflow steps that "own" their origin).
   */
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;

  /**
   * Delete chunks for a given `origin_id` from the SML index.
   *
   * When `ingestionMethod` is set, only chunks with that method are removed; otherwise
   * all chunks for the origin are removed regardless of method.
   *
   * Exposed on the indexer so callers (e.g. `upsertDocument` in the HTTP path) can run
   * a "delete crawled chunks, keep manual" cleanup after writing a manual entry, without
   * duplicating the index/error-handling boilerplate.
   */
  deleteChunks: (params: {
    originId: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: SmlIngestionMethod;
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

  async indexAttachment(params: SmlIndexerParams): Promise<void> {
    const {
      originId,
      attachmentType,
      action,
      spaces,
      esClient,
      savedObjectsClient,
      logger: contextLogger,
    } = params;
    const isContentMode = params.content !== undefined;

    this.logger.info(
      `SML indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', mode='${
        isContentMode ? 'content' : 'origin'
      }', spaces=[${spaces.join(', ')}]`
    );

    if (action === 'delete') {
      this.logger.info(
        `SML indexer: deleting crawled chunks for origin '${originId}' (manual entries preserved)`
      );
      await this.deleteChunks({ originId, esClient, ingestionMethod: 'crawled' });
      return;
    }

    if (isContentMode) {
      await this.indexManualChunks({
        originId,
        attachmentType,
        spaces,
        esClient,
        chunks: params.content!,
      });
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

    const force = params.force === true;
    if (!force) {
      const hasManual = await this.hasManualEntry({ originId, esClient });
      if (hasManual) {
        this.logger.debug(
          `SML indexer: skipping origin-mode index for '${originId}' (type='${attachmentType}') — manual entry exists. Pass force=true to override.`
        );
        return;
      }
    }

    const context: SmlContext = {
      esClient,
      savedObjectsClient: savedObjectsClient as SavedObjectsClientContract,
      logger: contextLogger,
    };

    this.logger.info(
      `SML indexer: calling getSmlData for origin '${originId}' of type '${attachmentType}'`
    );
    const smlData = await definition.getSmlData(originId, context);
    if (!smlData || smlData.chunks.length === 0) {
      this.logger.info(
        `SML indexer: no SML data returned for origin '${originId}' of type '${attachmentType}' — deleting existing crawled chunks (manual entries preserved)`
      );
      await this.deleteChunks({ originId, esClient, ingestionMethod: 'crawled' });
      return;
    }

    this.logger.debug(
      `SML indexer: getSmlData returned ${
        smlData.chunks.length
      } chunk(s) for origin '${originId}'. First chunk title: '${
        smlData.chunks[0]?.title
      }', content length: ${smlData.chunks[0]?.content?.length ?? 0}`
    );

    await this.deleteChunks({ originId, esClient });

    const bulkOps = smlData.chunks.map((chunk) =>
      // Use a bare UUID for `_id` (and the document's `id` field) so the chunk
      // identifier is bounded at 36 bytes regardless of `attachmentType` /
      // `originId` length. ES `_id` is capped at 512 bytes and `originId`
      // can be caller-supplied (e.g. via the workflow step's `with: originId`),
      // so an embed-the-inputs scheme was unbounded by construction. Lookups
      // happen via the `origin_id` and `type` document fields, not by parsing
      // `_id`, so dropping the prefix is purely an internal change.
      this.buildIndexOp({
        chunkId: uuidv4(),
        chunk,
        originId,
        spaces,
        ingestionMethod: 'crawled',
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, chunkCount: smlData.chunks.length });
  }

  async deleteAttachment(params: SmlIndexerDeleteAttachmentParams): Promise<void> {
    const { originId, attachmentType, esClient, spaces } = params;
    const scope: SmlDeleteScope = params.ingestionMethod ?? 'crawled';

    this.logger.info(
      `SML indexer: deleteAttachment called — originId='${originId}', type='${attachmentType}', scope='${scope}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    // `'all'` translates to "no ingestion_method filter" on the underlying
    // helper — that's the way `SmlIndexer.deleteChunks` distinguishes "wipe
    // everything for this origin" from "wipe a single method".
    await this.deleteChunks({
      originId,
      esClient,
      ...(scope !== 'all' ? { ingestionMethod: scope } : {}),
    });
  }

  /**
   * Write a content-mode (manual) attachment: skip getSmlData, write chunks directly
   * with deterministic IDs and `ingestion_method: 'manual'`. Always overwrites.
   */
  private async indexManualChunks({
    originId,
    attachmentType,
    spaces,
    esClient,
    chunks,
  }: {
    originId: string;
    attachmentType: string;
    spaces: string[];
    esClient: ElasticsearchClient;
    chunks: SmlChunk[];
  }): Promise<void> {
    if (chunks.length === 0) {
      this.logger.debug(
        `SML indexer: content mode for origin '${originId}' supplied no chunks — deleting existing chunks`
      );
      await this.deleteChunks({ originId, esClient });
      return;
    }

    this.logger.info(
      `SML indexer: content mode for origin '${originId}' of type '${attachmentType}' — writing ${chunks.length} chunk(s) as 'manual'`
    );

    await this.deleteChunks({ originId, esClient });

    const bulkOps = chunks.map((chunk) =>
      // Use a bare UUID for `_id`. The previous `${attachmentType}:${originId}:manual:${index}`
      // scheme was unbounded (the inputs can be caller-controlled) and the
      // determinism it advertised was redundant — `deleteChunks` above already
      // wipes every chunk for the `origin_id`, so re-runs cannot accumulate
      // stale rows. The `manual` literal was decoration; the document carries
      // `ingestion_method: 'manual'` for that semantic.
      this.buildIndexOp({
        chunkId: uuidv4(),
        chunk,
        originId,
        spaces,
        ingestionMethod: 'manual',
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, chunkCount: chunks.length });
  }

  private buildIndexOp({
    chunkId,
    chunk,
    originId,
    spaces,
    ingestionMethod,
  }: {
    chunkId: string;
    chunk: SmlChunk;
    originId: string;
    spaces: string[];
    ingestionMethod: SmlIngestionMethod;
  }) {
    const now = new Date().toISOString();
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
      ingestion_method: ingestionMethod,
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
  }

  private async executeBulk({
    bulkOps,
    esClient,
    originId,
    chunkCount,
  }: {
    bulkOps: Array<ReturnType<SmlIndexerImpl['buildIndexOp']>>;
    esClient: ElasticsearchClient;
    originId: string;
    chunkCount: number;
  }): Promise<void> {
    if (bulkOps.length === 0) {
      return;
    }

    const storage = createSmlStorage({ logger: this.logger, esClient });
    const smlClient = storage.getClient();

    this.logger.debug(
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
        this.logger.debug(
          `SML indexer: successfully indexed ${chunkCount} chunk(s) for origin '${originId}'`
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

  /**
   * Return true when any chunk for this `origin_id` carries `ingestion_method: 'manual'`.
   */
  private async hasManualEntry({
    originId,
    esClient,
  }: {
    originId: string;
    esClient: ElasticsearchClient;
  }): Promise<boolean> {
    try {
      const response = await esClient.count({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        terminate_after: 1,
        query: {
          bool: {
            filter: [{ term: { origin_id: originId } }, { term: { ingestion_method: 'manual' } }],
          },
        },
      });
      return (response.count ?? 0) > 0;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }
      // On unexpected errors, fail-open (treat as no manual entry) and log: the safety
      // net is best-effort. Real protection lives at the document level via the
      // HTTP upsert route. Errors here should not prevent the crawl from progressing.
      this.logger.warn(
        `SML indexer: hasManualEntry check failed for origin '${originId}': ${
          (error as Error).message
        }`
      );
      return false;
    }
  }

  /**
   * Delete SML chunks for a given `origin_id`.
   *
   * When `ingestionMethod` is set, only chunks with that method are removed
   * (e.g. `'crawled'` to wipe stale crawler output while preserving manual entries).
   * When omitted, all chunks for the origin are removed regardless of method.
   *
   * Uses `ignore_unavailable` / `allow_no_indices` so this is safe even before
   * the index has been created.
   */
  async deleteChunks({
    originId,
    esClient,
    ingestionMethod,
  }: {
    originId: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: SmlIngestionMethod;
  }): Promise<void> {
    const filter: Array<Record<string, unknown>> = [{ term: { origin_id: originId } }];
    if (ingestionMethod) {
      filter.push({ term: { ingestion_method: ingestionMethod } });
    }
    const label = ingestionMethod ? `${ingestionMethod} chunks` : 'chunks';

    try {
      this.logger.debug(
        `SML indexer: deleting existing ${label} for origin '${originId}' from index '${smlIndexName}'`
      );
      const result = await esClient.deleteByQuery({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { filter } },
        refresh: false,
      });
      if (result.deleted && result.deleted > 0) {
        this.logger.info(
          `SML indexer: deleted ${result.deleted} existing ${label} for origin '${originId}'`
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
        `SML indexer: failed to delete ${label} for origin '${originId}': ${
          (error as Error).message
        }`
      );
    }
  }
}
