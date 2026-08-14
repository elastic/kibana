/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { MemoryDocument } from '@kbn/agent-memory-common';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

export type {
  AuthorKind,
  CallSource,
  MemoryCategory,
  MemoryDocument,
  MemoryDocumentEnvelope,
  MemoryDocumentSnapshot,
  MemoryLifecycle,
  MemoryPayload,
  MemoryPayloadSnapshot,
  MemoryProvenance,
  MemoryScope,
  MemoryScopeKind,
  MemoryType,
} from '@kbn/agent-memory-common';

/**
 * Non-hidden index backed by @kbn/storage-adapter.
 *
 * Naming: `agent-memory` (no dot prefix) so users can query it directly with
 * `FROM agent-memory | WHERE …` in Discover / ES|QL. The `viewer` and `editor`
 * ES built-in roles grant read + view_index_metadata on all non-dot indices,
 * so no role changes are needed.
 *
 * Document and index operations use `asCurrentUser`. Template operations use
 * `asInternalUser`, because end users must not need the cluster-wide
 * `manage_index_templates` privilege.
 *
 * Agent Memory owns this KI-shaped root envelope and nested `memory` payload
 * (type = 'memory'). Significant Events KIs are shape prior art only: this
 * store has no shared runtime types, registration, or migration dependency.
 * All lifecycle, scope, and revision fields are local Agent Memory state.
 * They are mapped from day one because `dynamic: 'strict'` (hardcoded in the
 * adapter) rejects any unmapped field at write time.
 */
export const memoryStorageSettings = {
  name: 'agent-memory',
  schema: {
    properties: {
      // ── Agent Memory envelope (KI-shaped prior art) ────────────────────────
      // `_id` is handled by the adapter; `id` mirrors it for ES|QL access.
      id: types.keyword({}),
      /** Always 'memory' — discriminator for the local document contract. */
      type: types.keyword({}),
      title: types.text({}),
      description: types.text({}),
      /** Multi-value keyword; follows the prior-art KI tag shape. */
      tags: types.keyword({}),
      deleted: types.boolean({}),
      /** Per-record soft expiry (D5). Supersedes any index-level lifecycle. */
      expires_at: types.date({}),
      /** Dense vector for semantic recall; populated by inference pipeline. */
      search_embedding: types.semantic_text({}),
      /** Time of the latest revision; distinct from stable creation time. */
      '@timestamp': types.date({}),
      created_at: types.date({}),
      /** Kibana space; mandatory filter on every recall query (G3). */
      space_id: types.keyword({}),

      // ── Memory payload ─────────────────────────────────────────────────────
      memory: types.object({
        properties: {
          // Type dimensions (two orthogonal axes)
          /** Episodic / semantic / procedural — PDF / D2 axis. */
          type: types.keyword({}),
          /** Profile / preferences / entities / events / trajectories — #15403 G2 axis. */
          category: types.keyword({}),

          // Revision / content addressing
          /** Monotonically increasing integer; incremented on each supersession. */
          revision: types.long({}),
          /** SHA-256 of the normalised description; drives find-or-create dedup. */
          content_hash: types.keyword({}),

          // Scope. New writes default to user/author; missing legacy scope is
          // treated as user-scoped by mandatory author + space recall filters.
          /** 'user' | 'agent' | 'space' — stored visibility metadata. */
          scope_kind: types.keyword({}),
          /** Identifier for the scoped entity (agent_id, space_id, …). */
          scope_id: types.keyword({}),

          // Entity references
          /** Entity ids mentioned or tagged in this memory. */
          entities: types.keyword({}),

          // Quality metadata
          /** Where this memory originated: 'conversation' | 'system' | 'user' | … */
          origin: types.keyword({}),
          /** Confidence level: 'observed' | 'inferred' | 'stated'. */
          assurance: types.keyword({}),

          // Provenance block
          provenance: types.object({
            properties: {
              /** Identity key: profile_uid or username (see author_kind). */
              author: types.keyword({}),
              /** 'profile_uid' | 'username' — disambiguates the author field. */
              author_kind: types.keyword({}),
              /** 'mcp' | '1p' | 'workflow' | 'task' — origin of the write call. */
              call_source: types.keyword({}),
              /** Conversation ids this memory was extracted from. */
              conversation_ids: types.keyword({}),
              /** Distributed trace ids for observability. */
              trace_ids: types.keyword({}),
              /** Source memory ids when this record was derived from others (D11). */
              source_memory_ids: types.keyword({}),
            },
          }),

          // ── Local bi-temporal and lifecycle state ──────────────────────────
          // Recall requires: expired_at absent; suppress_until absent or <= now;
          // valid_at absent or <= now; and invalid_at absent or > now. These
          // markers are typed storage state, not public write input.
          valid_at: types.date({}),
          invalid_at: types.date({}),
          expired_at: types.date({}),
          superseded_by: types.keyword({}),
          suppress_until: types.date({}),
          use_count: types.long({}),
          last_used_at: types.date({}),

          // ── D11 reserved: diff / provenance chain ─────────────────────────
          /** Groups related revisions of the same logical memory across time. */
          diff_id: types.keyword({}),
          /** Memory ids this record was derived from (alternate provenance). */
          derived_from: types.keyword({}),
          /**
           * Full body of the previous revision.
           * `enabled: false` — stored in _source, not indexed.
           * Allows audit diff without polluting the inverted index.
           */
          prior_document: types.object({ enabled: false }),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type MemoryStorageSettings = typeof memoryStorageSettings;

export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryDocument>;

/** Creates the storage adapter for the `agent-memory` index. */
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
