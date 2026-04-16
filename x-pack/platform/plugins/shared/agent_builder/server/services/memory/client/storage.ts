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

      // Denormalized conversation ID for efficient aggregation queries.
      // Copied from source_refs[0].conversation_id at creation time.
      conversation_id: types.keyword({}),

      // Core memory fields
      type: types.keyword({}),
      subtype: types.keyword({}),
      summary: types.text({}),
      full: types.text({}),

      // Semantic text field for embedding-based similarity search.
      // ES auto-generates embeddings at index time via the configured inference endpoint.
      full_semantic: types.semantic_text({}),

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

      // Structured domain-specific properties (cognitive extraction mode)
      params: types.flattened({}),

      // Per-stage retrieval statistics stored as a flat object
      retrieval_stats_by_stage: types.object({ dynamic: false, properties: {} }),
    },
  },
} satisfies IndexStorageSettings;

export interface MemoryProperties {
  space: string;
  user_id?: string;
  user_name: string;
  conversation_id?: string;
  type: MemoryType;
  subtype?: string;
  summary: string;
  full: string;
  full_semantic?: string;
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
  params?: Record<string, unknown>;
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
export const ensureMemoryIndexMappings = async ({
  esClient,
  logger,
  inferenceEndpointId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  inferenceEndpointId?: string;
}): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: memoryIndexName });

    if (!exists) {
      logger.debug(
        `Memory index ${memoryIndexName} does not yet exist; mappings will be updated after first write.`
      );
      return;
    }

    const mappings = await esClient.indices.getMapping({ index: memoryIndexName });
    const indexMappings = mappings[memoryIndexName]?.mappings?.properties ?? {};

    // Update semantic_text field with inference endpoint if configured
    if (inferenceEndpointId && !('full_semantic' in indexMappings)) {
      logger.info(`Adding semantic_text mapping with inference_id=${inferenceEndpointId} to ${memoryIndexName}`);
      await esClient.indices.putMapping({
        index: memoryIndexName,
        properties: {
          full_semantic: {
            type: 'semantic_text',
            inference_id: inferenceEndpointId,
          } as MappingProperty,
        },
      });
    }
  } catch (err) {
    logger.warn(`Failed to ensure memory index mappings on ${memoryIndexName}: ${err.message}`);
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
