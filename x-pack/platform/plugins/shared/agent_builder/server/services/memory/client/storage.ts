/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type {
  MemoryType,
  MemoryStatus,
  MemoryEdgeType,
  MemorySourceRef,
  MemoryLink,
  RetrievalStage,
} from '@kbn/agent-builder-common';

export const memoryIndexName = chatSystemIndex('memory');

/**
 * Elasticsearch mapping for the agent memory index.
 *
 * Note: The `embedding` dense_vector field is NOT part of the storage settings
 * because kbn-storage-adapter does not support dense_vector. The field is managed
 * directly via the ES client when creating/updating the index mapping. The storage
 * adapter is used for all CRUD operations on the document body.
 *
 * kNN search is performed directly via esClient.search() with the knn parameter.
 */
const storageSettings = {
  name: memoryIndexName,
  schema: {
    properties: {
      // Identity / ownership
      space: types.keyword({}),
      user_id: types.keyword({}),
      user_name: types.keyword({}),

      // Core memory fields
      type: types.keyword({}),
      subtype: types.keyword({}),
      summary: types.text({}),
      full: types.text({}),

      // Scoring signals
      confidence: types.float({}),
      salience: types.float({}),
      recency: types.date({}),
      utility: types.float({}),
      stability: types.float({}),
      access_count: types.long({}),
      reinforcement_score: types.float({}),
      status: types.keyword({}),

      // Timestamps
      created_at: types.date({}),
      updated_at: types.date({}),
      last_used_at: types.date({}),
      last_reinforced_at: types.date({}),

      // Graph relationships – stored as nested for efficient per-link filtering
      links: types.nested({
        properties: {
          target_id: types.keyword({}),
          type: types.keyword({}),
          weight: types.float({}),
        },
      }),

      // Source provenance – stored as nested for efficient per-ref filtering
      source_refs: types.nested({
        properties: {
          conversation_id: types.keyword({}),
          round_id: types.keyword({}),
          message_ids: types.keyword({}),
        },
      }),

      // Conflict tracking (IDs of contradicting memories)
      conflict_refs: types.keyword({}),

      // Per-stage retrieval statistics stored as a flat object
      retrieval_stats_by_stage: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface MemoryProperties {
  space: string;
  user_id?: string;
  user_name: string;
  type: MemoryType;
  subtype?: string;
  summary: string;
  full: string;
  confidence: number;
  salience: number;
  recency: string;
  utility: number;
  stability: number;
  access_count: number;
  reinforcement_score: number;
  status: MemoryStatus;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  last_reinforced_at?: string;
  links?: Array<{
    target_id: string;
    type: MemoryEdgeType;
    weight: number;
  }>;
  source_refs?: Array<{
    conversation_id: string;
    round_id: string;
    message_ids?: string[];
  }>;
  conflict_refs?: string[];
  retrieval_stats_by_stage?: Partial<Record<RetrievalStage, { count: number; used_count: number }>>;
}

export type MemoryStorageSettings = typeof storageSettings;
export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryProperties>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): MemoryStorage => {
  return new StorageIndexAdapter<MemoryStorageSettings, MemoryProperties>(
    esClient,
    logger,
    storageSettings
  );
};

/**
 * Ensures the memory index exists with the correct dense_vector mapping for embeddings.
 * The kbn-storage-adapter creates the index automatically on first write, but we need
 * to put the dense_vector mapping separately since it's not supported by the adapter.
 *
 * This is called once during service start.
 */
export const ensureMemoryIndexWithEmbeddings = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: memoryIndexName });

    if (!exists) {
      // Index will be auto-created by storage adapter on first write.
      // We schedule a post-creation mapping update via a separate call after first write.
      logger.debug(
        `Memory index ${memoryIndexName} does not yet exist; dense_vector mapping will be added after first write.`
      );
      return;
    }

    // Check if the embedding field mapping already exists
    const mappings = await esClient.indices.getMapping({ index: memoryIndexName });
    const indexMappings = mappings[memoryIndexName]?.mappings?.properties ?? {};

    if (!('embedding' in indexMappings)) {
      logger.info(`Adding dense_vector embedding mapping to ${memoryIndexName}`);
      await esClient.indices.putMapping({
        index: memoryIndexName,
        properties: {
          embedding: {
            type: 'dense_vector',
            dims: 768,
            index: true,
            similarity: 'cosine',
          } as MappingProperty,
        },
      });
    }
  } catch (err) {
    // Non-fatal: kNN search will fall back to BM25-only if embedding field is absent.
    logger.warn(`Failed to ensure embedding mapping on ${memoryIndexName}: ${err.message}`);
  }
};

/**
 * Attempt to add the dense_vector mapping after the storage adapter has created the index.
 * This is used as a best-effort hook after the first memory document is written.
 */
export const addEmbeddingMappingIfMissing = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    const mappings = await esClient.indices.getMapping({ index: memoryIndexName });
    const indexMappings = mappings[memoryIndexName]?.mappings?.properties ?? {};

    if (!('embedding' in indexMappings)) {
      await esClient.indices.putMapping({
        index: memoryIndexName,
        properties: {
          embedding: {
            type: 'dense_vector',
            dims: 768,
            index: true,
            similarity: 'cosine',
          } as MappingProperty,
        },
      });
      logger.debug(`Successfully added embedding mapping to ${memoryIndexName}`);
    }
  } catch (err) {
    logger.warn(`Could not add embedding mapping to ${memoryIndexName}: ${err.message}`);
  }
};

/**
 * Convert MemoryLink[] (application type) to the storage representation.
 */
export const linksToStorage = (
  links: MemoryLink[]
): Array<{ target_id: string; type: MemoryEdgeType; weight: number }> => {
  return links.map(({ target_id, type, weight }) => ({ target_id, type, weight }));
};

/**
 * Convert MemorySourceRef[] (application type) to the storage representation.
 */
export const sourceRefsToStorage = (
  refs: MemorySourceRef[]
): Array<{ conversation_id: string; round_id: string; message_ids?: string[] }> => {
  return refs.map(({ conversation_id, round_id, message_ids }) => ({
    conversation_id,
    round_id,
    ...(message_ids ? { message_ids } : {}),
  }));
};
