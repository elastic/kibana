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
  SmlPermissions,
} from './types';
import { createSmlStorage, smlIndexName } from './sml_storage';
import { isNotFoundError } from './sml_service';
import type { SmlResolverRegistry } from './resolvers/types';
import { parseOriginId } from './resolvers/origin_id';
import { classifyPermission } from './resolvers/permissions_dsl';

export interface SmlIndexerDeps {
  registry: SmlTypeRegistry;
  resolverRegistry: SmlResolverRegistry;
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
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: SmlIngestionMethod;
  }) => Promise<void>;
}

export const createSmlIndexer = ({
  registry,
  resolverRegistry,
  logger,
}: SmlIndexerDeps): SmlIndexer => {
  return new SmlIndexerImpl({ registry, resolverRegistry, logger });
};

class SmlIndexerImpl implements SmlIndexer {
  private readonly registry: SmlTypeRegistry;
  private readonly resolverRegistry: SmlResolverRegistry;
  private readonly logger: Logger;

  constructor({ registry, resolverRegistry, logger }: SmlIndexerDeps) {
    this.registry = registry;
    this.resolverRegistry = resolverRegistry;
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
          originId,
          chunk,
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

    await this.deleteChunks({ originUri, esClient });

    const bulkOps = await Promise.all(
      chunks.map(async (chunk) => {
        // Use a bare UUID for `_id`. The previous `${attachmentType}:${originId}:manual:${index}`
        // scheme was unbounded (the inputs can be caller-controlled) and the
        // determinism it advertised was redundant — `deleteChunks` above already
        // wipes every chunk for the `origin_id`, so re-runs cannot accumulate
        // stale rows. The `manual` literal was decoration; the document carries
        // `ingestion_method: 'manual'` for that semantic.
        //
        // Resolver-derived permissions apply in content mode too — when a
        // workflow author writes against a resolver-prefixed `originId`
        // (e.g. `kibana://lens/<id>`), the resolver is authoritative and any
        // caller-supplied chunk permissions are logged + ignored. Mirrors
        // the origin-mode behaviour and keeps the workflow step in lockstep
        // with the crawler for registered SO-backed types.
        const resolvedPermissions = await this.resolvePermissionsForChunk({
          originId,
          chunk,
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
   * Compute the permissions to stamp on an SML document for a given chunk.
   *
   * When `originId` carries a registered URI scheme (`<scheme>://<path>`), the
   * matching resolver is authoritative: its `getPermissions(path)` output is
   * classified through the SML permissions DSL and folded into the nested
   * {@link SmlPermissions} shape. Any caller-supplied `chunk.permissions` is
   * logged as a misconfiguration and dropped — the resolver is the single
   * source of truth so the crawler, event-driven indexAttachment calls and
   * the workflow step's content-mode writes all agree on what privileges
   * gate a chunk.
   *
   * When `originId` has no scheme, the scheme is unregistered, or the
   * resolver throws, we fall back to caller-supplied `chunk.permissions`
   * (normalised to an empty `SmlPermissions` when absent). This preserves
   * the historical behaviour for SML types that compute their own
   * permissions in `getSmlData` (e.g. `connector`, `workflow`).
   */
  private async resolvePermissionsForChunk({
    originId,
    chunk,
  }: {
    originId: string;
    chunk: SmlChunk;
  }): Promise<SmlPermissions> {
    const chunkPermissions: SmlPermissions = {
      kibana: { privileges: chunk.permissions?.kibana?.privileges ?? [] },
      elasticsearch: { indices: chunk.permissions?.elasticsearch?.indices ?? [] },
    };

    const { scheme, path } = parseOriginId(originId);
    if (!scheme) {
      return chunkPermissions;
    }
    const resolver = this.resolverRegistry.get(scheme);
    if (!resolver) {
      return chunkPermissions;
    }

    let rawPermissions: string[];
    try {
      rawPermissions = await resolver.getPermissions(path);
    } catch (error) {
      this.logger.warn(
        `SML indexer: resolver '${scheme}' failed to compute permissions for origin '${originId}': ${
          (error as Error).message
        }`
      );
      return chunkPermissions;
    }

    if (
      chunkPermissions.kibana.privileges.length > 0 ||
      chunkPermissions.elasticsearch.indices.length > 0
    ) {
      this.logger.warn(
        `SML indexer: '${scheme}' resolver is authoritative for origin '${originId}'; ignoring caller-supplied chunk permissions`
      );
    }

    return foldDslToSmlPermissions({
      rawPermissions,
      scheme,
      originId,
      logger: this.logger,
    });
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
      permissions: resolvedPermissions,
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

/**
 * Translate a flat list of DSL-encoded permission strings (as produced by an
 * SML resolver) into the nested {@link SmlPermissions} shape the on-disk
 * mapping expects.
 *
 * Supported DSL prefixes (see `permissions_dsl.ts`):
 *   - `kibana:<priv>` or bare `<priv>` → `permissions.kibana.privileges`
 *   - `es-index:<idx>:read` / `:view_index_metadata` → `permissions.elasticsearch.indices`
 *
 * Dropped (with a warning):
 *   - `es-cluster:<priv>` — the nested storage has no slot for cluster
 *     privileges. Built-in resolvers do not emit these today; treated as a
 *     known latent gap rather than a regression.
 *   - `es-index:<idx>:<other>` — the search-time `_has_privileges` call is
 *     hard-coded to `'read'`, so other index-level privileges would not
 *     survive the round-trip. Storing the index name without preserving the
 *     requested privilege would silently change the access contract.
 *
 * Duplicate kibana privileges and duplicate index names are collapsed via set
 * semantics so test snapshots stay stable across reorderings.
 */
const foldDslToSmlPermissions = ({
  rawPermissions,
  scheme,
  originId,
  logger,
}: {
  rawPermissions: string[];
  scheme: string;
  originId: string;
  logger: Logger;
}): SmlPermissions => {
  const kibanaPrivs = new Set<string>();
  const esIndices = new Set<string>();

  for (const raw of rawPermissions) {
    const classified = classifyPermission(raw);
    if (classified.kind === 'kibana') {
      kibanaPrivs.add(classified.value);
    } else if (classified.kind === 'es-index') {
      if (classified.value === 'read' || classified.value === 'view_index_metadata') {
        esIndices.add(classified.index);
      } else {
        logger.warn(
          `SML indexer: resolver '${scheme}' emitted unsupported es-index privilege '${classified.value}' on index '${classified.index}' for origin '${originId}'; dropping`
        );
      }
    } else {
      logger.warn(
        `SML indexer: resolver '${scheme}' emitted es-cluster privilege '${classified.value}' for origin '${originId}'; cluster privileges are not yet representable in the SML storage shape and will be dropped`
      );
    }
  }

  return {
    kibana: {
      privileges: Array.from(kibanaPrivs, (name) => ({ name })),
    },
    elasticsearch: {
      indices: Array.from(esIndices, (name) => ({ name })),
    },
  };
};
