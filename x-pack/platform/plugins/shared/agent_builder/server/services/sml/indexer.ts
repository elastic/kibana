/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type {
  SmlContext,
  SmlDocument,
  SmlEntry,
  SmlDeleteScope,
  SmlIngestionMethod,
  SmlIndexerParams,
  SmlIndexerDeleteAttachmentParams,
  SmlPermissions,
  SmlTypeDefinition,
} from '@kbn/agent-builder-server';
import type { SmlTypeRegistry } from './type_registry';
import { createSmlStorage, smlIndexName } from './storage';
import { SmlUnregisteredTypeError } from './sml_unregistered_type_error';

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof errors.ResponseError && error.statusCode === 404;
};

export interface SmlIndexerDeps {
  registry: SmlTypeRegistry;
  logger: Logger;
}

export interface SmlIndexer {
  /**
   * Index, update, or delete SML data for a specific item.
   *
   * Resolves the registered type's `getSmlEntry` hook and writes the produced
   * entry tagged `ingestion_method: 'crawled'`. If an existing entry carries
   * `ingestion_method: 'manual'`, the call is a no-op unless `force: true`.
   * Unregistered types throw {@link SmlUnregisteredTypeError}.
   *
   * For `action: 'delete'`, only crawled entries are removed — manual entries
   * are preserved. Use {@link SmlIndexer.deleteAttachment} for broader scopes.
   */
  indexAttachment: (params: SmlIndexerParams) => Promise<void>;

  /**
   * Delete entries for an origin. Defaults to `'crawled'`; pass `'manual'`
   * or `'all'` for broader scopes.
   */
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;

  /**
   * Delete entries for a given `origin_id` from the SML index. When
   * `ingestionMethod` is set, only that method is removed; when `spaces`
   * is set, only entries visible in those spaces are removed.
   */
  deleteEntry: (params: {
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
    const originUri = `${attachmentType}://${originId}`;

    this.logger.info(
      `SML indexer: indexAttachment called — originId='${originId}', type='${attachmentType}', action='${action}', spaces=[${spaces.join(
        ', '
      )}]`
    );

    if (action === 'delete') {
      this.logger.info(
        `SML indexer: deleting crawled entry for origin '${originId}' (manual entries preserved)`
      );
      await this.deleteEntry({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      // Writes against unregistered types throw (fail-closed). Delete
      // still proceeds — see the early `action === 'delete'` branch above.
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
      `SML indexer: calling getSmlEntry for origin '${originId}' of type '${attachmentType}'`
    );
    const smlEntry = await definition.getSmlEntry(originId, context);
    if (!smlEntry) {
      this.logger.info(
        `SML indexer: no SML entry returned for origin '${originId}' of type '${attachmentType}' — deleting existing crawled entry (manual entries preserved)`
      );
      await this.deleteEntry({ originUri, esClient, ingestionMethod: 'crawled' });
      return;
    }

    this.logger.debug(
      `SML indexer: getSmlEntry returned an entry for origin '${originId}'. Title: '${
        smlEntry.title
      }', content length: ${smlEntry.content?.length ?? 0}`
    );

    // Resolve permissions BEFORE `deleteEntry` so a hook throw doesn't
    // leave the origin in a wiped state. `getPermissions(originId, ctx)`
    // is a per-origin computation.
    let resolvedPermissions: SmlPermissions;
    try {
      resolvedPermissions = await this.resolvePermissionsForOrigin({
        definition,
        originId,
        context,
      });
    } catch (error) {
      // Fail-closed: log with origin/type framing and propagate. The
      // existing entry for the origin remains intact (we haven't called
      // `deleteEntry` yet). See `resolvePermissionsForOrigin` JSDoc.
      this.logger.warn(
        `SML indexer: type '${
          definition.id
        }' getPermissions threw for origin '${originId}' — aborting origin-mode write to avoid producing an un-gated entry: ${
          (error as Error).message
        }`
      );
      throw error;
    }

    await this.deleteEntry({ originUri, esClient });

    // Use a bare UUID for `_id` (and the document's `id` field) so the
    // identifier is bounded at 36 bytes regardless of `attachmentType` /
    // `originId` length. ES `_id` is capped at 512 bytes and `originId`
    // can be caller-supplied (e.g. via the workflow step's `with: originId`),
    // so an embed-the-inputs scheme was unbounded by construction. Lookups
    // happen via the `origin_id` and `type` document fields, not by parsing
    // `_id`, so dropping the prefix is purely an internal change.
    const bulkOps = [
      this.buildIndexOp({
        entryId: uuidv4(),
        entry: smlEntry,
        originId,
        spaces,
        ingestionMethod: 'crawled',
        resolvedPermissions,
      }),
    ];

    await this.executeBulk({ bulkOps, esClient, originId });
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
    // helper — that's the way `SmlIndexer.deleteEntry` distinguishes "wipe
    // everything for this origin" from "wipe a single method".
    await this.deleteEntry({
      originUri: `${attachmentType}://${originId}`,
      esClient,
      spaces,
      ...(scope !== 'all' ? { ingestionMethod: scope } : {}),
    });
  }

  /**
   * Resolve the {@link SmlPermissions} to stamp on the entry for an
   * origin. Called **once per origin** before any ES mutation.
   * If the type has `getPermissions`, the hook result is used; otherwise
   * empty permissions (publicly readable within the space).
   */
  private async resolvePermissionsForOrigin({
    definition,
    originId,
    context,
  }: {
    definition: SmlTypeDefinition | undefined;
    originId: string;
    context: SmlContext;
  }): Promise<SmlPermissions> {
    if (definition && definition.getPermissions) {
      // Intentionally NOT wrapped in try/catch — see fail-closed note in
      // the JSDoc. Logging here is the caller's job (so origin-mode can
      // frame the failure with its own context).
      const result = await definition.getPermissions(originId, context);
      return {
        kibana: { privileges: result.kibana?.privileges ?? [] },
      };
    }

    return { kibana: { privileges: [] } };
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
    entry: SmlEntry;
    originId: string;
    spaces: string[];
    ingestionMethod: SmlIngestionMethod;
    resolvedPermissions: SmlPermissions;
    createdAt?: string;
  }) {
    const now = new Date().toISOString();
    const document: SmlDocument = {
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
  }: {
    bulkOps: Array<ReturnType<SmlIndexerImpl['buildIndexOp']>>;
    esClient: ElasticsearchClient;
    originId: string;
  }): Promise<void> {
    if (bulkOps.length === 0) {
      return;
    }

    const storage = createSmlStorage({ logger: this.logger, esClient });
    const smlClient = storage.getClient();

    this.logger.debug(
      `SML indexer: writing entry to index '${smlIndexName}' for origin '${originId}'`
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
        this.logger.debug(`SML indexer: successfully indexed entry for origin '${originId}'`);
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
   * Delete the SML entry for a given `origin_id`.
   *
   * When `ingestionMethod` is set, only the entry with that method is removed
   * (e.g. `'crawled'` to wipe stale crawler output while preserving a manual entry).
   * When omitted, the entry is removed regardless of method — since an origin can
   * carry both a `'crawled'` and a `'manual'` entry at once, this may delete both.
   *
   * Uses `ignore_unavailable` / `allow_no_indices` so this is safe even before
   * the index has been created.
   */
  async deleteEntry({
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
