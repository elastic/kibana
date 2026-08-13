/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';

/**
 * Non-hidden index backed by @kbn/storage-adapter.
 *
 * Naming: `agent-memory` (no dot prefix) so users can query it directly with
 * `FROM agent-memory | WHERE …` in Discover / ES|QL. The `viewer` and `editor`
 * ES built-in roles grant read + view_index_metadata on all non-dot indices,
 * so no role changes are needed.
 *
 * The schema is KI-envelope-shaped (type = 'memory') so a Phase-2 reindex is
 * a schema migration, not a redesign. All D5/D6/D11 fields are mapped from
 * day one because `dynamic: 'strict'` (hardcoded in the adapter) rejects any
 * unmapped field at write time.
 */
export const memoryStorageSettings = {
  name: 'agent-memory',
  schema: {
    properties: {
      // ── KI envelope ────────────────────────────────────────────────────────
      // `_id` is handled by the adapter; `id` mirrors it for ES|QL access.
      id: types.keyword({}),
      /** Always 'memory' — discriminator in the KI envelope union. */
      type: types.keyword({}),
      title: types.text({}),
      description: types.text({}),
      /** Multi-value keyword; same shape as KI tags. */
      tags: types.keyword({}),
      deleted: types.boolean({}),
      /** Per-record soft expiry (D5). Supersedes any index-level lifecycle. */
      expires_at: types.date({}),
      /** Dense vector for semantic recall; populated by inference pipeline. */
      search_embedding: types.semantic_text({}),
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

          // Scope (D6 — mapped, not enforced until Phase 3)
          /** 'user' | 'agent' | 'space' — visibility tier. */
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

          // ── D5 reserved: bi-temporal and lifecycle fields ─────────────────
          // None of these are used by Phase 1 logic; they are mapped so that
          // the schema remains stable when Phase 2 activates them.
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

// ── Document type ────────────────────────────────────────────────────────────

export type MemoryType = 'episodic' | 'semantic' | 'procedural';
export type MemoryCategory = 'profile' | 'preferences' | 'entities' | 'events' | 'trajectories';
export type AuthorKind = 'profile_uid' | 'username';
export type CallSource = 'mcp' | '1p' | 'workflow' | 'task';
export type MemoryScopeKind = 'user' | 'agent' | 'space';

export interface MemoryDocument {
  _id?: string;
  // KI envelope
  id: string;
  type: 'memory';
  title: string;
  description: string;
  tags?: string[];
  deleted?: boolean;
  expires_at?: string;
  search_embedding?: string;
  created_at: string;
  space_id: string;
  // Memory payload
  memory: {
    type?: MemoryType;
    category?: MemoryCategory;
    revision: number;
    content_hash: string;
    // D6 (reserved)
    scope_kind?: MemoryScopeKind;
    scope_id?: string;
    // Entity refs
    entities?: string[];
    // Quality
    origin?: string;
    assurance?: string;
    // Provenance
    provenance: {
      author: string;
      author_kind: AuthorKind;
      call_source?: CallSource;
      conversation_ids?: string[];
      trace_ids?: string[];
      source_memory_ids?: string[];
    };
    // D5 reserved
    valid_at?: string;
    invalid_at?: string;
    expired_at?: string;
    superseded_by?: string;
    suppress_until?: string;
    use_count?: number;
    last_used_at?: string;
    // D11 reserved
    diff_id?: string;
    derived_from?: string[];
    prior_document?: object;
  };
}

export type MemoryStorage = StorageIndexAdapter<MemoryStorageSettings, MemoryDocument>;

/** Creates the storage adapter for the `agent-memory` index. */
export const createMemoryStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): MemoryStorage => {
  return new StorageIndexAdapter<MemoryStorageSettings, MemoryDocument>(
    esClient,
    logger,
    memoryStorageSettings
  );
};
