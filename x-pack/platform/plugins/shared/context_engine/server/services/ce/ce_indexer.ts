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
import type { CeTypeRegistry } from './ce_type_registry';
import type {
  CeContext,
  CeDocument,
  CeEntry,
  CeDeleteScope,
  CeIngestionMethod,
  CeIndexerParams,
  CeIndexerDeleteAttachmentParams,
  CePermissions,
  CeTypeDefinition,
} from './types';
import { createCeStorage, ceIndexName } from './ce_storage';
import { isNotFoundError } from './ce_service';
import { CeUnregisteredTypeError, CePermissionsConflictError } from './ce_errors';

export interface CeIndexerDeps {
  registry: CeTypeRegistry;
  logger: Logger;
}

export interface CeIndexer {
  /**
   * Index, update, or delete CE data for a specific item.
   *
   * In origin mode (no `content`), the indexer resolves the type's `getCeData`
   * hook and writes the produced entries tagged `ingestion_method: 'crawled'`.
   * If any existing entries for this `origin_id` carry
   * `ingestion_method: 'manual'`, the call is a no-op unless `force: true` is
   * passed.
   *
   * In content mode (`content` provided), `getCeData` is skipped and the
   * provided entries are written directly, tagged `ingestion_method: 'manual'`.
   * The write always overwrites any existing entries for the `origin_id`.
   *
   * **Unregistered types are handled by mode:**
   *
   * - Origin mode (`action: 'create' | 'update'` without `content`) throws
   *   {@link CeUnregisteredTypeError} — there is no `getCeData` to call
   *   and no sensible fallback. The crawler and event-driven origin-mode
   *   callers only ever target registered types, so this is never hit in
   *   normal operation; the throw exists to surface programmer error.
   * - Content mode (`action: 'create' | 'update'` with `content`) accepts
   *   any `attachmentType`. When the type is registered, the entry is
   *   stamped with the result of `getPermissions`; when it is not, the
   *   indexer stamps empty `CePermissions` (no privileges required,
   *   space-scoped read) and emits a once-per-process warn for that
   *   `attachmentType` so operators see the implicit "public" stamping.
   *   Use this when a workflow needs to write ad-hoc content that has no
   *   dedicated CE type; register a real `CeTypeDefinition` if the
   *   content should be gated.
   *
   * **`getPermissions` failures fail-closed.** When the registered type's
   * `getPermissions` hook throws, the call is aborted *before* any
   * mutation (existing entries remain intact) and the throw is propagated
   * to the caller. Stamping empty permissions instead would be fail-open:
   * the read-path filter treats `kbnPrivs.length === 0` as publicly
   * readable. See `resolvePermissionsForOrigin` for the full rationale.
   *
   * For `action: 'delete'`, only entries with `ingestion_method: 'crawled'` are
   * removed — manual entries for the same `origin_id` are preserved. This keeps
   * curated content around even when the upstream object goes away (e.g.
   * transient blip, or a curator pinning standalone context to a deleted
   * dashboard). Callers that need to wipe `'manual'` or `'all'` entries should
   * use {@link CeIndexer.deleteAttachment} instead. **Delete is intentionally
   * permissive about registration** — cleanup must keep working even when the
   * plugin that originally registered the type is disabled, or stale entries
   * become unreachable from every write path.
   */
  indexAttachment: (params: CeIndexerParams) => Promise<void>;

  /**
   * Delete entries for an origin, with explicit control over which ingestion
   * method(s) are removed.
   *
   * The default scope (`'crawled'`) matches `indexAttachment({ action: 'delete' })`
   * for back-compat with the crawler and event-driven CRUD callers; pass
   * `'manual'` to wipe curated entries only, or `'all'` to fully retire the
   * origin (used by workflow steps that "own" their origin).
   */
  deleteAttachment: (params: CeIndexerDeleteAttachmentParams) => Promise<void>;

  /**
   * Delete entries for a given `origin_id` from the CE index.
   *
   * When `ingestionMethod` is set, only entries with that method are removed; otherwise
   * all entries for the origin are removed regardless of method.
   *
   * When `spaces` is set, only entries whose `spaces` array contains at least
   * one of the listed space IDs are removed. Omit for global deletes (e.g.
   * crawler origin-mode rewrites where the caller controls all spaces).
   *
   * Exposed on the indexer so internal callers can run a "delete crawled
   * entries, keep manual" cleanup after writing a manual entry without
   * duplicating the index/error-handling boilerplate. The public write
   * paths (HTTP routes, workflow step, event-driven CRUD) should use
   * `indexAttachment` / `deleteAttachment` instead.
   */
  deleteEntries: (params: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: CeIngestionMethod;
    spaces?: string[];
  }) => Promise<void>;
}

export const createCeIndexer = ({ registry, logger }: CeIndexerDeps): CeIndexer => {
  return new CeIndexerImpl({ registry, logger });
};

class CeIndexerImpl implements CeIndexer {
  private readonly registry: CeTypeRegistry;
  private readonly logger: Logger;
  /**
   * `attachmentType` values we've already emitted the "writing entries under
   * an unregistered type" warn for in this process. Bounded by the number
   * of distinct caller-supplied types, which is small in practice; we
   * deliberately do not cap or evict because doing so would just re-emit
   * the warn on the next write of an already-known type and add noise.
   */
  private readonly warnedUnregisteredTypes = new Set<string>();

  constructor({ registry, logger }: CeIndexerDeps) {
    this.registry = registry;
    this.logger = logger;
  }

  async indexAttachment(params: CeIndexerParams): Promise<void> {
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
      `CE indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', mode='${
        isContentMode ? 'content' : 'origin'
      }', spaces=[${spaces.join(', ')}]`
    );

    if (action === 'delete') {
      this.logger.info(
        `CE indexer: deleting crawled entries for origin '${originId}' (manual entries preserved)`
      );
      await this.deleteEntries({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    if (isContentMode) {
      await this.indexManualEntries({
        originId,
        attachmentType,
        spaces,
        esClient,
        savedObjectsClient,
        contextLogger,
        entries: params.content!,
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
      throw new CeUnregisteredTypeError(
        `CE indexer: type definition '${attachmentType}' is not registered — cannot index origin '${originId}'. Registered types: [${this.registry
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
          `CE indexer: skipping origin-mode index for '${originId}' (type='${attachmentType}') — manual entry exists. Pass force=true to override.`
        );
        return;
      }
    }

    const context: CeContext = {
      esClient,
      savedObjectsClient: savedObjectsClient as SavedObjectsClientContract,
      logger: contextLogger,
    };

    this.logger.info(
      `CE indexer: calling getCeData for origin '${originId}' of type '${attachmentType}'`
    );
    const ceData = await definition.getCeData(originId, context);
    if (!ceData || ceData.entries.length === 0) {
      this.logger.info(
        `CE indexer: no CE data returned for origin '${originId}' of type '${attachmentType}' — deleting existing crawled entries (manual entries preserved)`
      );
      await this.deleteEntries({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    this.logger.debug(
      `CE indexer: getCeData returned ${
        ceData.entries.length
      } entry(s) for origin '${originId}'. First entry title: '${
        ceData.entries[0]?.title
      }', content length: ${ceData.entries[0]?.content?.length ?? 0}`
    );

    // Resolve permissions BEFORE `deleteEntries` so a hook throw doesn't
    // leave the origin in a wiped state. `getPermissions(originId, ctx)`
    // is a per-origin computation (it doesn't take a entry), so one call
    // is correct and also avoids N hook invocations when getCeData
    // returns multiple entries for the same origin.
    let resolvedPermissions: CePermissions;
    try {
      resolvedPermissions = await this.resolvePermissionsForOrigin({
        definition,
        originId,
        context,
      });
    } catch (error) {
      // Fail-closed: log with origin/type framing and propagate. The
      // existing entries for the origin remain intact (we haven't called
      // `deleteEntries` yet). See `resolvePermissionsForOrigin` JSDoc.
      this.logger.warn(
        `CE indexer: type '${
          definition.id
        }' getPermissions threw for origin '${originId}' — aborting origin-mode write to avoid producing un-gated entries: ${
          (error as Error).message
        }`
      );
      throw error;
    }

    await this.deleteEntries({ originUri, esClient });

    const bulkOps = ceData.entries.map((entry) =>
      // Use a bare UUID for `_id` (and the document's `id` field) so the entry
      // identifier is bounded at 36 bytes regardless of `attachmentType` /
      // `originId` length. ES `_id` is capped at 512 bytes and `originId`
      // can be caller-supplied (e.g. via the workflow step's `with: originId`),
      // so an embed-the-inputs scheme was unbounded by construction. Lookups
      // happen via the `origin_id` and `type` document fields, not by parsing
      // `_id`, so dropping the prefix is purely an internal change.
      this.buildIndexOp({
        entryId: uuidv4(),
        entry,
        originId,
        spaces,
        ingestionMethod: 'crawled',
        resolvedPermissions,
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, entryCount: ceData.entries.length });
  }

  async deleteAttachment(params: CeIndexerDeleteAttachmentParams): Promise<void> {
    const { originId, attachmentType, esClient, spaces } = params;
    const scope: CeDeleteScope = params.ingestionMethod ?? 'crawled';

    this.logger.info(
      `CE indexer: deleteAttachment called — originId='${originId}', type='${attachmentType}', scope='${scope}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    // `'all'` translates to "no ingestion_method filter" on the underlying
    // helper — that's the way `CeIndexer.deleteEntries` distinguishes "wipe
    // everything for this origin" from "wipe a single method".
    await this.deleteEntries({
      originUri: `${attachmentType}://${originId}`,
      esClient,
      spaces,
      ...(scope !== 'all' ? { ingestionMethod: scope } : {}),
    });
  }

  /**
   * Write a content-mode (manual) attachment: skip getCeData, write entries
   * directly with bare-UUID IDs and `ingestion_method: 'manual'`. Always
   * overwrites.
   *
   * Permissions resolution:
   *
   * - **Registered type with `getPermissions`** — the hook's result is
   *   stamped onto every entry, identical to origin-mode behaviour so a
   *   content-mode write inherits the same gating as a crawler-driven
   *   write for the same type.
   * - **Registered type without `getPermissions`** — empty
   *   `CePermissions` is stamped (no privileges required); the entry is
   *   readable to anyone with access to the space.
   * - **Unregistered type** — empty `CePermissions` is stamped and a
   *   warn is logged once per process per `attachmentType` so operators
   *   can spot ad-hoc namespaces being created without permissions
   *   metadata. Content mode is intentionally permissive about
   *   registration so workflow authors can write ad-hoc content without a
   *   code change; the trade-off is that those entries become publicly
   *   readable in their space.
   *
   * The empty-entries fast path (no write actually happens) is treated as
   * a delete-via-content-mode and proceeds even for unregistered types,
   * mirroring the cleanup-must-still-work semantics of the
   * `action: 'delete'` path.
   */
  private async indexManualEntries({
    originId,
    attachmentType,
    spaces,
    esClient,
    savedObjectsClient,
    contextLogger,
    entries,
    createdAt,
    requestedPermissions,
  }: {
    originId: string;
    attachmentType: string;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
    contextLogger: Logger;
    entries: CeEntry[];
    createdAt?: string;
    requestedPermissions?: CePermissions;
  }): Promise<void> {
    const originUri = `${attachmentType}://${originId}`;
    if (entries.length === 0) {
      this.logger.debug(
        `CE indexer: content mode for origin '${originId}' supplied no entries — deleting existing entries`
      );
      await this.deleteEntries({ originUri, esClient, spaces });
      return;
    }

    this.logger.info(
      `CE indexer: content mode for origin '${originId}' of type '${attachmentType}' — writing ${entries.length} entry(s) as 'manual'`
    );

    // Content mode accepts any `attachmentType` — workflow authors and
    // HTTP callers can write entries under an unregistered namespace
    // (e.g. ad-hoc knowledge entries) without first registering a real
    // CeTypeDefinition. The trade-off is that without `getPermissions`,
    // the entry has no permission gate and is readable to anyone in the
    // space. We surface that trade-off with a one-time warn per
    // (process, type) so operators notice when a new namespace starts
    // being written with empty permissions.
    const definition = this.registry.get(attachmentType);
    if (!definition && !this.warnedUnregisteredTypes.has(attachmentType)) {
      this.warnedUnregisteredTypes.add(attachmentType);
      this.logger.warn(
        `CE indexer: unregistered type '${attachmentType}' (origin '${originId}'): stamping empty permissions — entries will be publicly readable within their space. Register an CeTypeDefinition to add a permission gate.`
      );
    }

    const context: CeContext = {
      esClient,
      savedObjectsClient: savedObjectsClient as SavedObjectsClientContract,
      logger: contextLogger,
    };

    // Resolve permissions BEFORE `deleteEntries` so a hook throw doesn't
    // leave the origin in a wiped state. Per-origin computation; see the
    // origin-mode write path for the rationale on hoisting this out of
    // the entry loop.
    let resolvedPermissions: CePermissions;
    try {
      resolvedPermissions = await this.resolvePermissionsForOrigin({
        definition,
        originId,
        context,
        requestedPermissions,
      });
    } catch (error) {
      const reason =
        error instanceof CePermissionsConflictError
          ? `caller-supplied permissions conflict with type '${definition?.id ?? attachmentType}'`
          : `type '${definition?.id ?? attachmentType}' getPermissions threw`;
      this.logger.warn(
        `CE indexer: ${reason} for origin '${originId}' — aborting content-mode write to avoid producing un-gated entries: ${
          (error as Error).message
        }`
      );
      throw error;
    }

    await this.deleteEntries({ originUri, esClient, spaces });

    const bulkOps = entries.map((entry) =>
      // Use a bare UUID for `_id`: deterministic IDs are redundant because
      // `deleteEntries` above wipes every entry for the origin before writing,
      // so re-runs cannot accumulate stale rows.
      this.buildIndexOp({
        entryId: uuidv4(),
        entry,
        originId,
        spaces,
        ingestionMethod: 'manual',
        resolvedPermissions,
        createdAt,
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, entryCount: entries.length });
  }

  /**
   * Resolve the {@link CePermissions} to stamp on every entry for an
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
    definition: CeTypeDefinition | undefined;
    originId: string;
    context: CeContext;
    requestedPermissions?: CePermissions;
  }): Promise<CePermissions> {
    if (definition && definition.getPermissions) {
      if (requestedPermissions) {
        throw new CePermissionsConflictError(
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
    entryId,
    entry,
    originId,
    spaces,
    ingestionMethod,
    resolvedPermissions,
    createdAt,
  }: {
    entryId: string;
    entry: CeEntry;
    originId: string;
    spaces: string[];
    ingestionMethod: CeIngestionMethod;
    resolvedPermissions: CePermissions;
    createdAt?: string;
  }) {
    const now = new Date().toISOString();
    const document: CeDocument = {
      id: entryId,
      type: entry.type,
      title: entry.title,
      origin: { uri: `${entry.type}://${originId}` },
      content: entry.content,
      created_at: createdAt || now,
      updated_at: now,
      spaces,
      permissions: {
        kibana: { privileges: resolvedPermissions.kibana?.privileges ?? [] },
        elasticsearch: { indices: resolvedPermissions.elasticsearch?.indices ?? [] },
      },
      ingestion_method: ingestionMethod,
    };
    if (entry.description !== undefined) {
      document.description = entry.description;
    }
    if (entry.tags !== undefined) {
      document.tags = entry.tags;
    }
    document.discovery_labels = [
      { value: entry.title, kind: 'title' },
      { value: entry.type, kind: 'type' },
      ...(entry.discovery_labels ?? []),
    ];
    if (entry.extended_attrs !== undefined) {
      document.extended_attrs = entry.extended_attrs;
    }
    if (entry.user_id !== undefined) {
      document.user_id = entry.user_id;
    }
    if (entry.references !== undefined) {
      document.references = entry.references;
    }
    return {
      index: {
        _id: entryId,
        document,
      },
    };
  }

  private async executeBulk({
    bulkOps,
    esClient,
    originId,
    entryCount,
  }: {
    bulkOps: Array<ReturnType<CeIndexerImpl['buildIndexOp']>>;
    esClient: ElasticsearchClient;
    originId: string;
    entryCount: number;
  }): Promise<void> {
    if (bulkOps.length === 0) {
      return;
    }

    const storage = createCeStorage({ logger: this.logger, esClient });
    const ceClient = storage.getClient();

    this.logger.debug(
      `CE indexer: writing ${bulkOps.length} entry(s) to index '${ceIndexName}' for origin '${originId}'`
    );
    try {
      const response = await ceClient.bulk({
        refresh: 'wait_for',
        operations: bulkOps,
      });

      if (response.errors) {
        const errorItems = response.items.filter((item) => item.index?.error);
        this.logger.error(
          `CE indexer: bulk index errors for '${originId}': ${JSON.stringify(
            errorItems.slice(0, 3)
          )}`
        );
      } else {
        this.logger.debug(
          `CE indexer: successfully indexed ${entryCount} entry(s) for origin '${originId}'`
        );
      }
    } catch (error) {
      this.logger.error(
        `CE indexer: failed to index CE data for origin '${originId}': ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }

  /**
   * Return true when any entry for this `origin_id` carries `ingestion_method: 'manual'`.
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
        index: ceIndexName,
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
        `CE indexer: hasManualEntry check failed for origin '${originUri}' (fail-closed): ${
          (error as Error).message
        }`
      );
      return true;
    }
  }

  /**
   * Delete CE entries for a given `origin_id`.
   *
   * When `ingestionMethod` is set, only entries with that method are removed
   * (e.g. `'crawled'` to wipe stale crawler output while preserving manual entries).
   * When omitted, all entries for the origin are removed regardless of method.
   *
   * Uses `ignore_unavailable` / `allow_no_indices` so this is safe even before
   * the index has been created.
   */
  async deleteEntries({
    originUri,
    esClient,
    ingestionMethod,
    spaces,
  }: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: CeIngestionMethod;
    spaces?: string[];
  }): Promise<void> {
    const filter: Array<Record<string, unknown>> = [{ term: { 'origin.uri': originUri } }];
    if (ingestionMethod) {
      filter.push({ term: { ingestion_method: ingestionMethod } });
    }
    if (spaces && spaces.length > 0) {
      // Scope the delete to entries visible in at least one of the provided
      // spaces. Mirrors `isVisibleInSpace`: a entry is visible when its
      // `spaces` array contains the space id OR the wildcard `'*'` (global
      // entries). Without the `'*'` entry, crawler-written globally-scoped
      // entries would survive the delete and violate the "claim the origin"
      // replace semantic of content-mode writes.
      filter.push({ terms: { spaces: [...spaces, '*'] } });
    }
    const label = ingestionMethod ? `${ingestionMethod} entries` : 'entries';

    try {
      this.logger.debug(
        `CE indexer: deleting existing ${label} for origin '${originUri}' from index '${ceIndexName}'`
      );
      const result = await esClient.deleteByQuery({
        index: ceIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { filter } },
        refresh: false,
      });
      if (result.deleted && result.deleted > 0) {
        this.logger.info(
          `CE indexer: deleted ${result.deleted} existing ${label} for origin '${originUri}'`
        );
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        this.logger.debug(
          `CE indexer: index '${ceIndexName}' not found — nothing to delete for '${originUri}'`
        );
        return;
      }
      this.logger.warn(
        `CE indexer: failed to delete ${label} for origin '${originUri}': ${
          (error as Error).message
        }`
      );
    }
  }
}
