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
import type {
  SmlContext,
  SmlDocument,
  SmlChunk,
  SmlDeleteScope,
  SmlIngestionMethod,
  SmlIndexerParams,
  SmlIndexerDeleteAttachmentParams,
  SmlPermissions,
  SmlTypeDefinition,
} from './types';
import { createSmlStorage, smlIndexName } from './sml_storage';
import { isNotFoundError } from './sml_service';
import { SmlUnregisteredTypeError } from './sml_errors';

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
   * **Unregistered types are handled by mode:**
   *
   * - Origin mode (`action: 'create' | 'update'` without `content`) throws
   *   {@link SmlUnregisteredTypeError} — there is no `getSmlData` to call
   *   and no sensible fallback. The crawler and event-driven origin-mode
   *   callers only ever target registered types, so this is never hit in
   *   normal operation; the throw exists to surface programmer error.
   * - Content mode (`action: 'create' | 'update'` with `content`) accepts
   *   any `attachmentType`. When the type is registered, the chunk is
   *   stamped with the result of `getPermissions`; when it is not, the
   *   indexer stamps empty `SmlPermissions` (no privileges required,
   *   space-scoped read) and emits a once-per-process warn for that
   *   `attachmentType` so operators see the implicit "public" stamping.
   *   Use this when a workflow needs to write ad-hoc content that has no
   *   dedicated SML type; register a real `SmlTypeDefinition` if the
   *   content should be gated.
   *
   * For `action: 'delete'`, only chunks with `ingestion_method: 'crawled'` are
   * removed — manual entries for the same `origin_id` are preserved. This keeps
   * curated content around even when the upstream object goes away (e.g.
   * transient blip, or a curator pinning standalone context to a deleted
   * dashboard). Callers that need to wipe `'manual'` or `'all'` chunks should
   * use {@link SmlIndexer.deleteAttachment} instead. **Delete is intentionally
   * permissive about registration** — cleanup must keep working even when the
   * plugin that originally registered the type is disabled, or stale chunks
   * become unreachable from every write path.
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
   * Exposed on the indexer so internal callers can run a "delete crawled
   * chunks, keep manual" cleanup after writing a manual entry without
   * duplicating the index/error-handling boilerplate. The public write
   * paths (HTTP routes, workflow step, event-driven CRUD) should use
   * `indexAttachment` / `deleteAttachment` instead.
   */
  deleteChunks: (params: {
    originUri: string;
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
  /**
   * `attachmentType` values we've already emitted the "writing chunks under
   * an unregistered type" warn for in this process. Bounded by the number
   * of distinct caller-supplied types, which is small in practice; we
   * deliberately do not cap or evict because doing so would just re-emit
   * the warn on the next write of an already-known type and add noise.
   */
  private readonly warnedUnregisteredTypes = new Set<string>();

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
    const originUri = `${attachmentType}://${originId}`;

    this.logger.info(
      `SML indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', mode='${
        isContentMode ? 'content' : 'origin'
      }', spaces=[${spaces.join(', ')}]`
    );

    if (action === 'delete') {
      this.logger.info(
        `SML indexer: deleting crawled chunks for origin '${originId}' (manual entries preserved)`
      );
      await this.deleteChunks({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    if (isContentMode) {
      await this.indexManualChunks({
        originId,
        attachmentType,
        spaces,
        esClient,
        savedObjectsClient,
        contextLogger,
        chunks: params.content!,
      });
      return;
    }

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      // Single point of enforcement: origin-mode writes against unregistered
      // types throw rather than silently no-op, mirroring content mode below.
      // The old "log a warning and return" behaviour silently dropped the
      // crawler's work when a type was disabled, which made the data plane
      // and the registry drift without any signal. Delete still proceeds —
      // see the early `action === 'delete'` branch above.
      throw new SmlUnregisteredTypeError(
        `SML indexer: type definition '${attachmentType}' is not registered — cannot index origin '${originId}'. Registered types: [${this.registry
          .list()
          .map((t) => t.id)
          .join(', ')}]`
      );
    }

    const force = params.force === true;
    if (!force) {
      const hasManual = await this.hasManualEntry({ originUri, esClient });
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
      await this.deleteChunks({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    this.logger.debug(
      `SML indexer: getSmlData returned ${
        smlData.chunks.length
      } chunk(s) for origin '${originId}'. First chunk title: '${
        smlData.chunks[0]?.title
      }', content length: ${smlData.chunks[0]?.content?.length ?? 0}`
    );

    await this.deleteChunks({ originUri, esClient });

    const bulkOps = await Promise.all(
      smlData.chunks.map(async (chunk) => {
        // Use a bare UUID for `_id` (and the document's `id` field) so the chunk
        // identifier is bounded at 36 bytes regardless of `attachmentType` /
        // `originId` length. ES `_id` is capped at 512 bytes and `originId`
        // can be caller-supplied (e.g. via the workflow step's `with: originId`),
        // so an embed-the-inputs scheme was unbounded by construction. Lookups
        // happen via the `origin_id` and `type` document fields, not by parsing
        // `_id`, so dropping the prefix is purely an internal change.
        const resolvedPermissions = await this.resolvePermissionsForChunk({
          definition,
          originId,
          context,
        });
        return this.buildIndexOp({
          chunkId: uuidv4(),
          chunk,
          originId,
          spaces,
          ingestionMethod: 'crawled',
          resolvedPermissions,
        });
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
      originUri: `${attachmentType}://${originId}`,
      esClient,
      ...(scope !== 'all' ? { ingestionMethod: scope } : {}),
    });
  }

  /**
   * Write a content-mode (manual) attachment: skip getSmlData, write chunks
   * directly with bare-UUID IDs and `ingestion_method: 'manual'`. Always
   * overwrites.
   *
   * Permissions resolution:
   *
   * - **Registered type with `getPermissions`** — the hook's result is
   *   stamped onto every chunk, identical to origin-mode behaviour so a
   *   content-mode write inherits the same gating as a crawler-driven
   *   write for the same type.
   * - **Registered type without `getPermissions`** — empty
   *   `SmlPermissions` is stamped (no privileges required); the chunk is
   *   readable to anyone with access to the space.
   * - **Unregistered type** — empty `SmlPermissions` is stamped and a
   *   warn is logged once per process per `attachmentType` so operators
   *   can spot ad-hoc namespaces being created without permissions
   *   metadata. Content mode is intentionally permissive about
   *   registration so workflow authors can write ad-hoc content without a
   *   code change; the trade-off is that those chunks become publicly
   *   readable in their space.
   *
   * The empty-chunks fast path (no write actually happens) is treated as
   * a delete-via-content-mode and proceeds even for unregistered types,
   * mirroring the cleanup-must-still-work semantics of the
   * `action: 'delete'` path.
   */
  private async indexManualChunks({
    originId,
    attachmentType,
    spaces,
    esClient,
    savedObjectsClient,
    contextLogger,
    chunks,
  }: {
    originId: string;
    attachmentType: string;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    contextLogger: Logger;
    chunks: SmlChunk[];
  }): Promise<void> {
    const originUri = `${attachmentType}://${originId}`;
    if (chunks.length === 0) {
      this.logger.debug(
        `SML indexer: content mode for origin '${originId}' supplied no chunks — deleting existing chunks`
      );
      await this.deleteChunks({ originUri, esClient });
      return;
    }

    this.logger.info(
      `SML indexer: content mode for origin '${originId}' of type '${attachmentType}' — writing ${chunks.length} chunk(s) as 'manual'`
    );

    // Content mode accepts any `attachmentType` — workflow authors and
    // HTTP callers can write chunks under an unregistered namespace
    // (e.g. ad-hoc knowledge entries) without first registering a real
    // SmlTypeDefinition. The trade-off is that without `getPermissions`,
    // the chunk has no permission gate and is readable to anyone in the
    // space. We surface that trade-off with a one-time warn per
    // (process, type) so operators notice when a new namespace starts
    // being written with empty permissions.
    const definition = this.registry.get(attachmentType);
    if (!definition && !this.warnedUnregisteredTypes.has(attachmentType)) {
      this.warnedUnregisteredTypes.add(attachmentType);
      this.logger.warn(
        `SML indexer: writing chunks under unregistered type '${attachmentType}' (origin '${originId}', and likely more) with empty permissions — these chunks will be publicly readable within their space. Register an SmlTypeDefinition for '${attachmentType}' if you need a permission gate.`
      );
    }

    await this.deleteChunks({ originUri, esClient });

    const context: SmlContext = {
      esClient,
      savedObjectsClient: savedObjectsClient as SavedObjectsClientContract,
      logger: contextLogger,
    };

    const bulkOps = await Promise.all(
      chunks.map(async (chunk) => {
        // Use a bare UUID for `_id`. The previous `${attachmentType}:${originId}:manual:${index}`
        // scheme was unbounded (the inputs can be caller-controlled) and the
        // determinism it advertised was redundant — `deleteChunks` above already
        // wipes every chunk for the `origin_id`, so re-runs cannot accumulate
        // stale rows. The `manual` literal was decoration; the document carries
        // `ingestion_method: 'manual'` for that semantic.
        const resolvedPermissions = await this.resolvePermissionsForChunk({
          definition,
          originId,
          context,
        });
        return this.buildIndexOp({
          chunkId: uuidv4(),
          chunk,
          originId,
          spaces,
          ingestionMethod: 'manual',
          resolvedPermissions,
        });
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, chunkCount: chunks.length });
  }

  /**
   * Resolve the {@link SmlPermissions} to stamp on a chunk.
   *
   * - Registered type with `getPermissions` → the hook's result is used
   *   (with arrays defensively defaulted to `[]` so the stored document
   *   always has fully-shaped inner arrays).
   * - Registered type without `getPermissions` → empty `SmlPermissions`.
   * - Unregistered type (`definition === undefined`) → empty
   *   `SmlPermissions`. Only reachable via content-mode writes; origin-mode
   *   rejects unregistered types upstream via
   *   {@link SmlUnregisteredTypeError}. The warn line announcing the
   *   namespace is emitted by `indexManualChunks` once per process per
   *   type so this helper can stay quiet on the hot path.
   *
   * Empty privileges are treated by the read-path filter as "no
   * privileges required" — appropriate only for types that intentionally
   * make their data publicly readable within the space. SML types
   * backing sensitive resources MUST implement the hook.
   *
   * A `getPermissions` throw is treated as a hard failure-closed: the
   * indexer logs a warning and stamps empty permissions. The alternative
   * — using caller-supplied permissions — is the spoofing surface this
   * design removes, so we intentionally fail closed instead.
   */
  private async resolvePermissionsForChunk({
    definition,
    originId,
    context,
  }: {
    definition: SmlTypeDefinition | undefined;
    originId: string;
    context: SmlContext;
  }): Promise<SmlPermissions> {
    if (!definition || !definition.getPermissions) {
      return { kibana: { privileges: [] }, elasticsearch: { indices: [] } };
    }
    try {
      const result = await definition.getPermissions(originId, context);
      return {
        kibana: { privileges: result.kibana?.privileges ?? [] },
        elasticsearch: { indices: result.elasticsearch?.indices ?? [] },
      };
    } catch (error) {
      this.logger.warn(
        `SML indexer: type '${
          definition.id
        }' getPermissions threw for origin '${originId}' — stamping empty permissions: ${
          (error as Error).message
        }`
      );
      return { kibana: { privileges: [] }, elasticsearch: { indices: [] } };
    }
  }

  private buildIndexOp({
    chunkId,
    chunk,
    originId,
    spaces,
    ingestionMethod,
    resolvedPermissions,
  }: {
    chunkId: string;
    chunk: SmlChunk;
    originId: string;
    spaces: string[];
    ingestionMethod: SmlIngestionMethod;
    resolvedPermissions: SmlPermissions;
  }) {
    const now = new Date().toISOString();
    const document: SmlDocument = {
      id: chunkId,
      type: chunk.type,
      title: chunk.title,
      origin: { uri: `${chunk.type}://${originId}` },
      content: chunk.content,
      created_at: now,
      updated_at: now,
      spaces,
      permissions: {
        kibana: { privileges: resolvedPermissions.kibana?.privileges ?? [] },
        elasticsearch: { indices: resolvedPermissions.elasticsearch?.indices ?? [] },
      },
      ingestion_method: ingestionMethod,
    };
    if (chunk.description !== undefined) {
      document.description = chunk.description;
    }
    if (chunk.tags !== undefined) {
      document.tags = chunk.tags;
    }
    document.discovery_labels = [
      { value: chunk.title, kind: 'title' },
      { value: chunk.type, kind: 'type' },
      ...(chunk.discovery_labels ?? []),
    ];
    if (chunk.extended_attrs !== undefined) {
      document.extended_attrs = chunk.extended_attrs;
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
    originUri,
    esClient,
  }: {
    originUri: string;
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
            filter: [
              { term: { 'origin.uri': originUri } },
              { term: { ingestion_method: 'manual' } },
            ],
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
        `SML indexer: hasManualEntry check failed for origin '${originUri}': ${
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
    originUri,
    esClient,
    ingestionMethod,
  }: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: SmlIngestionMethod;
  }): Promise<void> {
    const filter: Array<Record<string, unknown>> = [{ term: { 'origin.uri': originUri } }];
    if (ingestionMethod) {
      filter.push({ term: { ingestion_method: ingestionMethod } });
    }
    const label = ingestionMethod ? `${ingestionMethod} chunks` : 'chunks';

    try {
      this.logger.debug(
        `SML indexer: deleting existing ${label} for origin '${originUri}' from index '${smlIndexName}'`
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
          `SML indexer: deleted ${result.deleted} existing ${label} for origin '${originUri}'`
        );
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        this.logger.debug(
          `SML indexer: index '${smlIndexName}' not found — nothing to delete for '${originUri}'`
        );
        return;
      }
      this.logger.warn(
        `SML indexer: failed to delete ${label} for origin '${originUri}': ${
          (error as Error).message
        }`
      );
    }
  }
}
