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
import { SmlUnregisteredTypeError, SmlPermissionsConflictError } from './sml_errors';

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
   * **`getPermissions` failures fail-closed.** When the registered type's
   * `getPermissions` hook throws, the call is aborted *before* any
   * mutation (existing chunks remain intact) and the throw is propagated
   * to the caller. Stamping empty permissions instead would be fail-open:
   * the read-path filter treats `kbnPrivs.length === 0` as publicly
   * readable. See `resolvePermissionsForOrigin` for the full rationale.
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
   * When `spaces` is set, only chunks whose `spaces` array contains at least
   * one of the listed space IDs are removed. Omit for global deletes (e.g.
   * crawler origin-mode rewrites where the caller controls all spaces).
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
    spaces?: string[];
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
        createdAt: params.createdAt,
        requestedPermissions: params.permissions,
      });
      return;
    }

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      // Origin-mode writes against unregistered types throw (fail-closed),
      // mirroring content mode below. Delete still proceeds —
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

    // Resolve permissions BEFORE `deleteChunks` so a hook throw doesn't
    // leave the origin in a wiped state. `getPermissions(originId, ctx)`
    // is a per-origin computation (it doesn't take a chunk), so one call
    // is correct and also avoids N hook invocations when getSmlData
    // returns multiple chunks for the same origin.
    let resolvedPermissions: SmlPermissions;
    try {
      resolvedPermissions = await this.resolvePermissionsForOrigin({
        definition,
        originId,
        context,
      });
    } catch (error) {
      // Fail-closed: log with origin/type framing and propagate. The
      // existing chunks for the origin remain intact (we haven't called
      // `deleteChunks` yet). See `resolvePermissionsForOrigin` JSDoc.
      this.logger.warn(
        `SML indexer: type '${
          definition.id
        }' getPermissions threw for origin '${originId}' — aborting origin-mode write to avoid producing un-gated chunks: ${
          (error as Error).message
        }`
      );
      throw error;
    }

    await this.deleteChunks({ originUri, esClient });

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
        resolvedPermissions,
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
      spaces,
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
    createdAt,
    requestedPermissions,
  }: {
    originId: string;
    attachmentType: string;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    contextLogger: Logger;
    chunks: SmlChunk[];
    createdAt?: string;
    requestedPermissions?: SmlPermissions;
  }): Promise<void> {
    const originUri = `${attachmentType}://${originId}`;
    if (chunks.length === 0) {
      this.logger.debug(
        `SML indexer: content mode for origin '${originId}' supplied no chunks — deleting existing chunks`
      );
      await this.deleteChunks({ originUri, esClient, spaces });
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
        `SML indexer: unregistered type '${attachmentType}' (origin '${originId}'): stamping empty permissions — chunks will be publicly readable within their space. Register an SmlTypeDefinition to add a permission gate.`
      );
    }

    const context: SmlContext = {
      esClient,
      savedObjectsClient: savedObjectsClient as SavedObjectsClientContract,
      logger: contextLogger,
    };

    // Resolve permissions BEFORE `deleteChunks` so a hook throw doesn't
    // leave the origin in a wiped state. Per-origin computation; see the
    // origin-mode write path for the rationale on hoisting this out of
    // the chunk loop.
    let resolvedPermissions: SmlPermissions;
    try {
      resolvedPermissions = await this.resolvePermissionsForOrigin({
        definition,
        originId,
        context,
        requestedPermissions,
      });
    } catch (error) {
      const reason =
        error instanceof SmlPermissionsConflictError
          ? `caller-supplied permissions conflict with type '${definition?.id ?? attachmentType}'`
          : `type '${definition?.id ?? attachmentType}' getPermissions threw`;
      this.logger.warn(
        `SML indexer: ${reason} for origin '${originId}' — aborting content-mode write to avoid producing un-gated chunks: ${
          (error as Error).message
        }`
      );
      throw error;
    }

    await this.deleteChunks({ originUri, esClient, spaces });

    const bulkOps = chunks.map((chunk) =>
      // Use a bare UUID for `_id`: deterministic IDs are redundant because
      // `deleteChunks` above wipes every chunk for the origin before writing,
      // so re-runs cannot accumulate stale rows.
      this.buildIndexOp({
        chunkId: uuidv4(),
        chunk,
        originId,
        spaces,
        ingestionMethod: 'manual',
        resolvedPermissions,
        createdAt,
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, chunkCount: chunks.length });
  }

  /**
   * Resolve the {@link SmlPermissions} to stamp on every chunk for an
   * origin. Called **once per origin** before any ES mutation
   *
   * - If only a hook is present, it wins.
   * - If only `requestedPermissions` is supplied, they are used.
   * - If both a hook is present AND `requestedPermissions` are supplied, an error is thrown.
   * - If neither, permissions are left empty.
   */
  private async resolvePermissionsForOrigin({
    definition,
    originId,
    context,
    requestedPermissions,
  }: {
    definition: SmlTypeDefinition | undefined;
    originId: string;
    context: SmlContext;
    requestedPermissions?: SmlPermissions;
  }): Promise<SmlPermissions> {
    if (definition && definition.getPermissions) {
      if (requestedPermissions) {
        throw new SmlPermissionsConflictError(
          `attachmentType '${definition.id}' derives permissions via getPermissions() and does not accept a caller-supplied 'permissions' value for origin '${originId}'.`
        );
      }

      // Intentionally NOT wrapped in try/catch — see fail-closed note in
      // the JSDoc. Logging here is the caller's job (so origin-mode and
      // content-mode can frame the failure with their own context).
      const result = await definition.getPermissions(originId, context);
      return {
        kibana: { privileges: result.kibana?.privileges ?? [] },
        elasticsearch: { indices: result.elasticsearch?.indices ?? [] },
      };
    }

    if (requestedPermissions) {
      return {
        kibana: { privileges: requestedPermissions.kibana?.privileges ?? [] },
        elasticsearch: { indices: requestedPermissions.elasticsearch?.indices ?? [] },
      };
    }

    return { kibana: { privileges: [] }, elasticsearch: { indices: [] } };
  }

  private buildIndexOp({
    chunkId,
    chunk,
    originId,
    spaces,
    ingestionMethod,
    resolvedPermissions,
    createdAt,
  }: {
    chunkId: string;
    chunk: SmlChunk;
    originId: string;
    spaces: string[];
    ingestionMethod: SmlIngestionMethod;
    resolvedPermissions: SmlPermissions;
    createdAt?: string;
  }) {
    const now = new Date().toISOString();
    const document: SmlDocument = {
      id: chunkId,
      type: chunk.type,
      title: chunk.title,
      origin: { uri: `${chunk.type}://${originId}` },
      content: chunk.content,
      created_at: createdAt || now,
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
        // index_not_found: no index yet, no manual entry.
        return false;
      }
      // Unexpected ES error: fail-closed — skip this crawl tick rather than risk destroying a manual entry.
      this.logger.warn(
        `SML indexer: hasManualEntry check failed for origin '${originUri}' (fail-closed): ${
          (error as Error).message
        }`
      );
      return true;
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
    spaces,
  }: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: SmlIngestionMethod;
    spaces?: string[];
  }): Promise<void> {
    const filter: Array<Record<string, unknown>> = [{ term: { 'origin.uri': originUri } }];
    if (ingestionMethod) {
      filter.push({ term: { ingestion_method: ingestionMethod } });
    }
    if (spaces && spaces.length > 0) {
      // Scope the delete to chunks visible in at least one of the provided
      // spaces. Mirrors `isVisibleInSpace`: a chunk is visible when its
      // `spaces` array contains the space id OR the wildcard `'*'` (global
      // chunks). Without the `'*'` entry, crawler-written globally-scoped
      // chunks would survive the delete and violate the "claim the origin"
      // replace semantic of content-mode writes.
      filter.push({ terms: { spaces: [...spaces, '*'] } });
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
