/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeDefinition, SmlContext, SmlCrawlerStateDocument } from './types';
import type { SmlIndexer } from './sml_indexer';
import {
  createSmlCrawlerStateStorage,
  smlCrawlerStateIndexName,
  type SmlCrawlerStateStorage,
} from './sml_crawler_state_storage';
import { smlIndexName } from './sml_storage';

export interface SmlCrawlerDeps {
  indexer: SmlIndexer;
  logger: Logger;
}

/**
 * The SML crawler enumerates registered SML types, compares the current state
 * with what has been previously indexed, and queues create/update/delete actions
 * to be processed by the indexer.
 */
export interface SmlCrawler {
  /**
   * Run the crawler for a specific attachment type.
   * Fetches all items across all spaces in a single pass.
   * This is called by the task manager scheduled task.
   */
  crawl: (params: {
    definition: SmlTypeDefinition;
    esClient: ElasticsearchClient;
    savedObjectsClient: ISavedObjectsRepository;
  }) => Promise<void>;
}

export const createSmlCrawler = ({ indexer, logger }: SmlCrawlerDeps): SmlCrawler => {
  return new SmlCrawlerImpl({ indexer, logger });
};

class SmlCrawlerImpl implements SmlCrawler {
  private readonly indexer: SmlIndexer;
  private readonly logger: Logger;
  private cleanupDone = false;

  constructor({ indexer, logger }: SmlCrawlerDeps) {
    this.indexer = indexer;
    this.logger = logger;
  }

  async crawl({
    definition,
    esClient,
    savedObjectsClient,
  }: {
    definition: SmlTypeDefinition;
    esClient: ElasticsearchClient;
    savedObjectsClient: ISavedObjectsRepository;
  }): Promise<void> {
    if (!this.cleanupDone) {
      try {
        await this.cleanupStaleConcreteIndices(esClient);
        this.cleanupDone = true;
      } catch (error) {
        this.logger.warn(
          `SML crawler: stale index cleanup failed: ${(error as Error).message}`
        );
      }
    }

    const crawlerStateStorage = createSmlCrawlerStateStorage({
      logger: this.logger,
      esClient,
    });
    const stateClient = crawlerStateStorage.getClient();

    const context: SmlContext = {
      esClient,
      savedObjectsClient,
      logger: this.logger,
    };

    this.logger.info(`SML crawler: starting crawl for type '${definition.id}' across all spaces`);

    // 1. List current items from the source (all spaces at once)
    let currentItems;
    try {
      currentItems = await definition.list(context);
      this.logger.info(
        `SML crawler: listed ${currentItems.length} item(s) from source for type '${definition.id}'`
      );
    } catch (error) {
      this.logger.error(
        `SML crawler: failed to list items for type '${definition.id}': ${(error as Error).message}`
      );
      return;
    }

    // 2. Load existing crawler state for this type
    let existingState = await this.loadCrawlerState({
      stateClient,
      attachmentType: definition.id,
    });
    this.logger.info(
      `SML crawler: loaded ${existingState.length} existing state doc(s) for type '${definition.id}'`
    );

    // 2b. Data integrity check: if the crawler state has items but the SML data
    // index is missing or empty for this type, the data was lost (e.g. index
    // rename / cleanup). Reset the state so everything gets re-indexed.
    if (existingState.length > 0) {
      const smlDataCount = await this.countSmlDocuments({
        esClient,
        attachmentType: definition.id,
      });
      this.logger.info(
        `SML crawler: integrity check for type '${definition.id}' — ${existingState.length} state doc(s), ${smlDataCount} SML data doc(s) in index '${smlIndexName}'`
      );
      if (smlDataCount === 0) {
        this.logger.warn(
          `SML crawler: data integrity mismatch for type '${definition.id}' — ` +
            `${existingState.length} state doc(s) but 0 documents in SML data index. ` +
            `Resetting crawler state to force full re-index.`
        );
        existingState = [];
      }
    }

    // Build maps for comparison
    const currentItemMap = new Map(currentItems.map((item) => [item.id, item]));
    const existingStateMap = new Map(existingState.map((doc) => [doc.attachment_id, doc]));

    const now = new Date().toISOString();
    const operations: Array<{ id: string; document: SmlCrawlerStateDocument }> = [];
    let newCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let unchangedCount = 0;

    // 3. Find new and updated items
    for (const item of currentItems) {
      const existing = existingStateMap.get(item.id);
      if (!existing) {
        newCount++;
        operations.push({
          id: `${definition.id}:${item.id}`,
          document: {
            attachment_id: item.id,
            attachment_type: definition.id,
            spaces: item.spaces,
            created_at: now,
            updated_at: item.updatedAt,
            update_action: 'create',
          },
        });
      } else if (
        existing.updated_at < item.updatedAt ||
        !arraysEqual(existing.spaces, item.spaces)
      ) {
        updatedCount++;
        operations.push({
          id: `${definition.id}:${item.id}`,
          document: {
            ...existing,
            spaces: item.spaces,
            updated_at: item.updatedAt,
            update_action: 'update',
          },
        });
      } else {
        unchangedCount++;
      }
    }

    // 4. Find deleted items
    for (const [attachmentId, state] of existingStateMap) {
      if (!currentItemMap.has(attachmentId)) {
        deletedCount++;
        operations.push({
          id: `${definition.id}:${attachmentId}`,
          document: {
            ...state,
            update_action: 'delete',
          },
        });
      }
    }

    this.logger.info(
      `SML crawler: diff for type '${definition.id}': ${newCount} new, ${updatedCount} updated, ${deletedCount} deleted, ${unchangedCount} unchanged`
    );

    // 5. Write state updates via storage client
    if (operations.length > 0) {
      this.logger.info(
        `SML crawler: writing ${operations.length} state operation(s) for type '${definition.id}'`
      );
      try {
        await stateClient.bulk({
          refresh: 'wait_for',
          operations: operations.map(({ id, document }) => ({
            index: { _id: id, document },
          })),
        });
        this.logger.info(
          `SML crawler: state operations written successfully for type '${definition.id}'`
        );
      } catch (error) {
        this.logger.error(
          `SML crawler: failed to update state for type '${definition.id}': ${
            (error as Error).message
          }`
        );
        return;
      }
    } else {
      this.logger.info(`SML crawler: no state changes needed for type '${definition.id}'`);
    }

    // 6. Process queued actions
    await this.processQueue({
      attachmentType: definition.id,
      esClient,
      savedObjectsClient,
      stateClient,
    });
  }

  /**
   * Process all queued actions (non-null update_action) for a type.
   */
  private async processQueue({
    attachmentType,
    esClient,
    savedObjectsClient,
    stateClient,
  }: {
    attachmentType: string;
    esClient: ElasticsearchClient;
    savedObjectsClient: ISavedObjectsRepository;
    stateClient: ReturnType<SmlCrawlerStateStorage['getClient']>;
  }): Promise<void> {
    const pendingResponse = await stateClient.search({
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { attachment_type: attachmentType } },
            { exists: { field: 'update_action' } },
          ],
          must_not: [{ term: { update_action: '' } }],
        },
      },
      size: 1000,
    });

    const pendingItems = pendingResponse.hits.hits;
    if (pendingItems.length === 0) {
      this.logger.info(`SML crawler: no pending actions to process for type '${attachmentType}'`);
      return;
    }

    this.logger.info(
      `SML crawler: processing ${pendingItems.length} pending action(s) for type '${attachmentType}'`
    );

    let processedCount = 0;
    let errorCount = 0;
    const stateAckOps: Array<
      | { index: { _id: string; document: SmlCrawlerStateDocument } }
      | { delete: { _id: string } }
    > = [];

    for (const hit of pendingItems) {
      if (!hit._id) {
        this.logger.warn('SML crawler: skipping hit without _id');
        continue;
      }

      const doc = hit._source;
      if (!doc || !doc.update_action) {
        this.logger.debug(`SML crawler: skipping hit '${hit._id}' — no source or update_action`);
        continue;
      }

      const normalized = normalizeStateDocument(
        doc as SmlCrawlerStateDocument & { space_id?: string }
      );

      try {
        this.logger.info(
          `SML crawler: processing '${normalized.update_action}' for attachment '${normalized.attachment_id}' (type: ${normalized.attachment_type})`
        );

        await this.indexer.indexAttachment({
          attachmentId: normalized.attachment_id,
          attachmentType: normalized.attachment_type,
          action: normalized.update_action,
          spaces: normalized.spaces,
          esClient,
          savedObjectsClient,
          logger: this.logger,
        });

        if (normalized.update_action === 'delete') {
          stateAckOps.push({ delete: { _id: hit._id } });
        } else {
          stateAckOps.push({
            index: {
              _id: hit._id,
              document: { ...normalized, update_action: null },
            },
          });
        }
        processedCount++;
      } catch (error) {
        errorCount++;
        this.logger.error(
          `SML crawler: failed to process action '${normalized.update_action}' for '${
            normalized.attachment_id
          }': ${(error as Error).message}`
        );
      }
    }

    if (stateAckOps.length > 0) {
      try {
        await stateClient.bulk({ refresh: 'wait_for', operations: stateAckOps });
      } catch (error) {
        this.logger.error(
          `SML crawler: failed to ACK state updates for type '${attachmentType}': ${
            (error as Error).message
          }`
        );
      }
    }

    this.logger.info(
      `SML crawler: queue processing complete for type '${attachmentType}': ${processedCount} succeeded, ${errorCount} failed`
    );
  }

  /**
   * If a concrete index exists with the same name as a StorageIndexAdapter alias,
   * delete it. This can happen when a previous code path wrote directly to the
   * index name (bypassing the adapter), causing ES to auto-create a concrete index.
   * The adapter needs the name free to use as an alias.
   *
   * Also cleans up the old `.chat-sml` index/template that was renamed to `.chat-sml-data`
   * to avoid index template pattern collisions (`.chat-sml-*` matched `.chat-sml-crawler-state-*`).
   */
  private async cleanupStaleConcreteIndices(esClient: ElasticsearchClient): Promise<void> {
    const indexNames = [smlCrawlerStateIndexName, smlIndexName];

    for (const indexName of indexNames) {
      try {
        // Check if a concrete index (not an alias) exists with this name
        const exists = await esClient.indices.exists({ index: indexName });
        if (!exists) continue;

        // Check if it's an alias (which is the expected state) — if so, nothing to clean up
        const isAlias = await esClient.indices.existsAlias({ name: indexName }).catch(() => false);
        if (isAlias) continue;

        // It's a concrete index with the alias name — delete it
        this.logger.warn(
          `Deleting stale concrete index '${indexName}' that conflicts with the StorageIndexAdapter alias`
        );
        await esClient.indices.delete({ index: indexName });
      } catch (error) {
        this.logger.debug(
          `Failed to clean up stale index '${indexName}': ${(error as Error).message}`
        );
      }
    }

    // Clean up the old `.chat-sml` index template and any backing indices from the
    // previous naming scheme. The SML data index was renamed from `.chat-sml` to
    // `.chat-sml-data` to avoid pattern collisions with `.chat-sml-crawler-state`.
    await this.cleanupOldSmlIndex(esClient);
  }

  /**
   * Remove the old `.chat-sml` index template and any concrete/alias indices
   * that used the old name, so the renamed `.chat-sml-data` can work cleanly.
   */
  private async cleanupOldSmlIndex(esClient: ElasticsearchClient): Promise<void> {
    const oldName = '.chat-sml';

    // Delete old index template if it exists
    try {
      await esClient.indices.deleteIndexTemplate({ name: oldName });
      this.logger.info(`Deleted old index template '${oldName}'`);
    } catch (error) {
      // 404 is expected if the template doesn't exist
      if ((error as { statusCode?: number }).statusCode !== 404) {
        this.logger.debug(
          `Failed to delete old index template '${oldName}': ${(error as Error).message}`
        );
      }
    }

    // Delete old backing indices (e.g. `.chat-sml-000001`) if any exist
    try {
      const oldIndices = await esClient.indices.get({
        index: `${oldName}-0*`,
        ignore_unavailable: true,
        allow_no_indices: true,
      });

      const indexNamesToDelete = Object.keys(oldIndices);
      if (indexNamesToDelete.length > 0) {
        this.logger.info(`Deleting old SML backing indices: ${indexNamesToDelete.join(', ')}`);
        await esClient.indices.delete({ index: indexNamesToDelete });
      }
    } catch (error) {
      this.logger.debug(`Failed to clean up old SML backing indices: ${(error as Error).message}`);
    }

    // Also delete a concrete index named `.chat-sml` if it exists
    try {
      const exists = await esClient.indices.exists({ index: oldName });
      if (exists) {
        this.logger.info(`Deleting stale concrete index '${oldName}'`);
        await esClient.indices.delete({ index: oldName });
      }
    } catch (error) {
      this.logger.debug(
        `Failed to delete old concrete index '${oldName}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Count how many documents exist in the SML data index for a given attachment type.
   * Returns 0 if the index doesn't exist yet.
   */
  private async countSmlDocuments({
    esClient,
    attachmentType,
  }: {
    esClient: ElasticsearchClient;
    attachmentType: string;
  }): Promise<number> {
    try {
      const response = await esClient.count({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          term: { type: attachmentType },
        },
      });
      return response.count;
    } catch {
      // Index doesn't exist yet — that's fine, return 0
      return 0;
    }
  }

  /**
   * Load all crawler state documents for a given attachment type.
   */
  private async loadCrawlerState({
    stateClient,
    attachmentType,
  }: {
    stateClient: ReturnType<SmlCrawlerStateStorage['getClient']>;
    attachmentType: string;
  }): Promise<SmlCrawlerStateDocument[]> {
    const allDocs: SmlCrawlerStateDocument[] = [];
    const pageSize = 1000;

    try {
      let searchAfter: Array<string | number> | undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await stateClient.search({
          track_total_hits: false,
          query: {
            bool: {
              filter: [{ term: { attachment_type: attachmentType } }],
            },
          },
          size: pageSize,
          sort: [{ attachment_id: 'asc' }],
          ...(searchAfter ? { search_after: searchAfter } : {}),
        });

        const hits = response.hits.hits;
        for (const hit of hits) {
          if (hit._source) {
            allDocs.push(normalizeStateDocument(hit._source as SmlCrawlerStateDocument & { space_id?: string }));
          }
        }

        if (hits.length < pageSize) {
          hasMore = false;
        } else {
          const lastHit = hits[hits.length - 1];
          searchAfter = lastHit.sort as Array<string | number>;
        }
      }
    } catch (error) {
      this.logger.warn(
        `SML crawler: failed to load crawler state for type '${attachmentType}': ${(error as Error).message}`
      );
      return [];
    }

    return allDocs;
  }
}

/**
 * Normalize a state document from the old format (space_id: string) to the
 * new format (spaces: string[]). Old documents written before the schema
 * migration will have space_id but no spaces field.
 */
const normalizeStateDocument = (
  doc: SmlCrawlerStateDocument & { space_id?: string }
): SmlCrawlerStateDocument => {
  if (doc.spaces) return doc;
  const { space_id: spaceId, ...rest } = doc;
  return { ...rest, spaces: spaceId ? [spaceId] : [] };
};

const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, i) => val === sortedB[i]);
};
