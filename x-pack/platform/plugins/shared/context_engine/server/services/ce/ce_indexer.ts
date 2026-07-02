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
import type { CeTypeRegistry } from './ce_type_registry';
import type {
  CeContext,
  CeDocument,
  CeEntry,
  CeDeleteScope,
  CeIngestionMethod,
  CeIndexerParams,
  CeIndexerDeleteAttachmentParams,
} from './types';
import { createCeStorage, ceIndexName } from './ce_storage';
import { isNotFoundError } from './ce_service';

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
   * For `action: 'delete'`, only entries with `ingestion_method: 'crawled'` are
   * removed — manual entries for the same `origin_id` are preserved. This keeps
   * curated content around even when the upstream object goes away (e.g.
   * transient blip, or a curator pinning standalone context to a deleted
   * dashboard). Callers that need to wipe `'manual'` or `'all'` entries should
   * use {@link CeIndexer.deleteAttachment} instead.
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
   * Exposed on the indexer so callers (e.g. `upsertDocument` in the HTTP path) can run
   * a "delete crawled entries, keep manual" cleanup after writing a manual entry, without
   * duplicating the index/error-handling boilerplate.
   */
  deleteEntries: (params: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: CeIngestionMethod;
  }) => Promise<void>;
}

export const createCeIndexer = ({ registry, logger }: CeIndexerDeps): CeIndexer => {
  return new CeIndexerImpl({ registry, logger });
};

class CeIndexerImpl implements CeIndexer {
  private readonly registry: CeTypeRegistry;
  private readonly logger: Logger;

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
        entries: params.content!,
      });
      return;
    }

    const definition = this.registry.get(attachmentType);
    if (!definition) {
      this.logger.warn(
        `CE indexer: type definition '${attachmentType}' not found — skipping indexing for '${originId}'. Registered types: [${this.registry
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
      ...(scope !== 'all' ? { ingestionMethod: scope } : {}),
    });
  }

  /**
   * Write a content-mode (manual) attachment: skip getCeData, write entries directly
   * with deterministic IDs and `ingestion_method: 'manual'`. Always overwrites.
   */
  private async indexManualEntries({
    originId,
    attachmentType,
    spaces,
    esClient,
    entries,
  }: {
    originId: string;
    attachmentType: string;
    spaces: string[];
    esClient: ElasticsearchClient;
    entries: CeEntry[];
  }): Promise<void> {
    const originUri = `${attachmentType}://${originId}`;
    if (entries.length === 0) {
      this.logger.debug(
        `CE indexer: content mode for origin '${originId}' supplied no entries — deleting existing entries`
      );
      await this.deleteEntries({ originUri, esClient });
      return;
    }

    this.logger.info(
      `CE indexer: content mode for origin '${originId}' of type '${attachmentType}' — writing ${entries.length} entry(s) as 'manual'`
    );

    await this.deleteEntries({ originUri, esClient });

    const bulkOps = entries.map((entry) =>
      // Use a bare UUID for `_id`. The previous `${attachmentType}:${originId}:manual:${index}`
      // scheme was unbounded (the inputs can be caller-controlled) and the
      // determinism it advertised was redundant — `deleteEntries` above already
      // wipes every entry for the `origin_id`, so re-runs cannot accumulate
      // stale rows. The `manual` literal was decoration; the document carries
      // `ingestion_method: 'manual'` for that semantic.
      this.buildIndexOp({
        entryId: uuidv4(),
        entry,
        originId,
        spaces,
        ingestionMethod: 'manual',
      })
    );

    await this.executeBulk({ bulkOps, esClient, originId, entryCount: entries.length });
  }

  private buildIndexOp({
    entryId,
    entry,
    originId,
    spaces,
    ingestionMethod,
  }: {
    entryId: string;
    entry: CeEntry;
    originId: string;
    spaces: string[];
    ingestionMethod: CeIngestionMethod;
  }) {
    const now = new Date().toISOString();
    const document: CeDocument = {
      id: entryId,
      type: entry.type,
      title: entry.title,
      origin: { uri: `${entry.type}://${originId}` },
      content: entry.content,
      created_at: now,
      updated_at: now,
      spaces,
      permissions: {
        kibana: { privileges: entry.permissions?.kibana?.privileges ?? [] },
        elasticsearch: { indices: entry.permissions?.elasticsearch?.indices ?? [] },
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
        `CE indexer: failed to index CE data for origin '${originId}': ${(error as Error).message}`
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
        return false;
      }
      // On unexpected errors, fail-open (treat as no manual entry) and log: the safety
      // net is best-effort. Real protection lives at the document level via the
      // HTTP upsert route. Errors here should not prevent the crawl from progressing.
      this.logger.warn(
        `CE indexer: hasManualEntry check failed for origin '${originUri}': ${
          (error as Error).message
        }`
      );
      return false;
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
  }: {
    originUri: string;
    esClient: ElasticsearchClient;
    ingestionMethod?: CeIngestionMethod;
  }): Promise<void> {
    const filter: Array<Record<string, unknown>> = [{ term: { 'origin.uri': originUri } }];
    if (ingestionMethod) {
      filter.push({ term: { ingestion_method: ingestionMethod } });
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
