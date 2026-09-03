/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { AGENT_MEMORY_INDEX, type MemoryDocument } from '../../common';

const AI_INDEX_BASE_MAPPINGS_COMPONENT = 'ai-index@mappings';
const AI_INDEX_CUSTOM_COMPONENT = 'ai-index@custom';
export const AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE = 'ai-index-agent-memory@mappings';

export type {
  AuthorKind,
  CallSource,
  MemoryCategory,
  MemoryDocument,
  MemoryDocumentEnvelope,
  MemoryPayload,
  MemoryProvenance,
  MemoryScopeKind,
  MemoryType,
} from '../../common';

const semanticMultiField = {
  semantic: types.semantic_text({}),
};

const baseProvidedSchemaProperties = {
  '@timestamp': types.date({}),
  type: types.keyword({}),
  title: types.text({ fields: semanticMultiField }),
  description: types.text({ fields: semanticMultiField }),
  content: types.text({ fields: semanticMultiField }),
  tags: types.keyword({}),
  attributes: types.flattened({}),
  references: types.object({
    properties: {
      uri: types.keyword({}),
    },
  }),
};

export const agentMemoryMappingsComponentProperties = {
  // `_id` is handled by the adapter; `id` mirrors it for ES|QL access.
  id: types.keyword({}),
  deleted: types.boolean({}),
  /** Per-record soft expiry (D5). Supersedes any index-level lifecycle. */
  expires_at: types.date({}),
  created_at: types.date({}),
  /** Kibana space; mandatory filter on every recall query (G3). */
  space_id: types.keyword({}),
  permissions: types.object({
    properties: {
      kibana: types.object({
        properties: {
          privileges: types.nested({
            properties: {
              name: types.keyword({}),
              space: types.keyword({}),
              count: types.long({}),
            },
          }),
        },
      }),
    },
  }),

  /** Consumer namespace. Default 'agent_memory'. Prevents cross-consumer data collision. */
  namespace: types.keyword({}),

  // ── Memory payload ─────────────────────────────────────────────────────
  memory: types.object({
    properties: {
      /** Legacy type metadata remains mapped so existing documents stay queryable. */
      type: types.keyword({}),
      /** Closed category used by new writes and recall filtering. */
      category: types.keyword({}),

      // Revision / content addressing
      /** Monotonically increasing integer; incremented on each supersession. */
      revision: types.long({}),
      /** SHA-256 of the normalised description; part of the scope-aware dedup key. */
      content_hash: types.keyword({}),

      // Authoritative application visibility and ownership scope.
      /** 'user' for personal memories, 'space' for team-shared memories. */
      scope_kind: types.keyword({}),
      /** Identifier for the scoped user or future team. */
      scope_id: types.keyword({}),

      // Creator provenance; never used for visibility or ownership.
      provenance: types.object({
        properties: {
          /** Creator identity key: profile_uid or username (see author_kind). */
          author: types.keyword({}),
          /** 'profile_uid' | 'username' — disambiguates the author field. */
          author_kind: types.keyword({}),
          /** 'agent' | 'user' | 'mcp' | 'workflow' | 'unknown' — write-call origin. */
          call_source: types.keyword({}),
          /** IDs of recalled memories that informed this write (attribution chain). */
          used_memory_ids: types.keyword({}),
        },
      }),
    },
  }),
};

/**
 * Non-hidden index backed by @kbn/storage-adapter.
 *
 * Naming: `ai-index-idx-agent-memory` (no dot prefix) so users can query it
 * directly in Discover / ES|QL. The `viewer` and `editor` ES built-in roles
 * grant read + view_index_metadata on all non-dot indices, so no role changes
 * are needed.
 *
 * Document and index operations use `asCurrentUser`. Template operations use
 * `asInternalUser`, because end users must not need the cluster-wide
 * `manage_index_templates` privilege.
 *
 * Shared AI-index envelope mappings are composed before the Agent Memory-owned
 * mappings. The adapter's owned component template uses `dynamic: 'strict'`,
 * so every plugin-owned Phase 1 field is mapped here.
 */
export const memoryStorageSettings = {
  name: AGENT_MEMORY_INDEX,
  priority: 600,
  composedOf: [
    AI_INDEX_BASE_MAPPINGS_COMPONENT,
    AI_INDEX_CUSTOM_COMPONENT,
    AGENT_MEMORY_MAPPINGS_COMPONENT_TEMPLATE,
  ],
  ignoreMissingComponentTemplates: [AI_INDEX_CUSTOM_COMPONENT],
  inlineSchemaMappings: false,
  schema: {
    properties: {
      ...baseProvidedSchemaProperties,
      ...agentMemoryMappingsComponentProperties,
    },
  },
} satisfies IndexStorageSettings;

export type MemoryStorageSettings = typeof memoryStorageSettings;

export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryDocument>;

/** Creates the storage adapter for the Agent Memory index. */
export const createMemoryStorage = ({
  logger,
  esClient,
  indexManagementClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  indexManagementClient: ElasticsearchClient;
}): MemoryStorage => {
  return new StorageIndexAdapter<MemoryStorageSettings, MemoryDocument>(
    esClient,
    logger,
    memoryStorageSettings,
    { indexManagementClient }
  );
};
