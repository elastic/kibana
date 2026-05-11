/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowed type keys for the `filters` parameter in SML search.
 * Extend this enum when adding new filterable SML types.
 */
export enum SmlSearchFilterType {
  connector = 'connector',
}

/**
 * Per-type filter criteria for SML search.
 * Keys must be values of {@link SmlSearchFilterType}.
 */
export type SmlSearchFilters = Partial<Record<SmlSearchFilterType, { ids?: string[] }>>;

/**
 * Max length of `query` for POST `/internal/agent_context_layer/sml/_search`.
 */
export const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/**
 * Response body for `POST /internal/agent_context_layer/sml/_search`.
 */
export interface SmlSearchHttpResponse {
  total: number;
  results: SmlSearchHttpResultItem[];
}

export interface SmlSearchHttpResultItem {
  id: string;
  type: string;
  origin_id: string;
  title: string;
  score: number;
  content?: string;
}

/**
 * Allowed values for the `action` field of the SML index endpoint.
 */
export type SmlIndexAttachmentHttpAction = 'create' | 'update' | 'delete';

/**
 * Max length of `origin_id` for `POST /internal/agent_context_layer/sml/_index`.
 */
export const SML_HTTP_INDEX_ORIGIN_ID_MAX_LENGTH = 1024;

/**
 * Max length of `attachment_type` for `POST /internal/agent_context_layer/sml/_index`.
 */
export const SML_HTTP_INDEX_ATTACHMENT_TYPE_MAX_LENGTH = 256;

/**
 * Max length of a chunk's `title`.
 */
export const SML_HTTP_CHUNK_TITLE_MAX_LENGTH = 1024;

/**
 * Max length of a chunk's `content`.
 *
 * Conservative cap to keep request bodies small; callers with larger documents
 * should split them across multiple chunks.
 */
export const SML_HTTP_CHUNK_CONTENT_MAX_LENGTH = 32_768;

/**
 * Max length of a chunk's optional `description`.
 */
export const SML_HTTP_CHUNK_DESCRIPTION_MAX_LENGTH = 4_096;

/**
 * Max number of chunks accepted in a single `create`/`update` request.
 */
export const SML_HTTP_INDEX_MAX_CHUNKS = 100;

/**
 * Single SML chunk in the HTTP request body. Mirrors {@link import('../../server/services/sml/types').SmlChunk}.
 */
export interface SmlIndexAttachmentHttpChunk {
  /** Type of the chunk (e.g., 'visualization', 'dashboard'). */
  type: string;
  /** Display title. */
  title: string;
  /** Searchable content (indexed as `semantic_text`). */
  content: string;
  /** Optional longer summary for semantic search. */
  description?: string;
  /** Optional owner or last-modifier user id. */
  user_id?: string;
  /** Optional list of referenced SML chunk ids. */
  references?: string[];
  /** Optional Kibana privilege strings required to view this chunk in search results. */
  permissions?: string[];
}

/**
 * Request body for `POST /internal/agent_context_layer/sml/_index`.
 *
 * `chunks` is **required** for `create`/`update` actions (caller supplies the
 * content directly; no `getSmlData` hook is invoked) and **forbidden** for
 * `delete` (which only needs `origin_id`).
 */
export type SmlIndexAttachmentHttpRequest =
  | {
      origin_id: string;
      attachment_type: string;
      action: 'create' | 'update';
      chunks: SmlIndexAttachmentHttpChunk[];
    }
  | {
      origin_id: string;
      attachment_type: string;
      action: 'delete';
    };

/**
 * Response body for `POST /internal/agent_context_layer/sml/_index`.
 */
export interface SmlIndexAttachmentHttpResponse {
  acknowledged: true;
}
