/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Max length of `query` for POST `/internal/agent_builder/sml/_search` (route validation + UI).
 * The agent `sml_search` tool uses its own separate limit in its Zod schema.
 */
export const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/** Max items per `POST /internal/agent_builder/sml/_attach` (matches `sml_attach` tool). */
export const SML_HTTP_ATTACH_ITEMS_MAX = 50;

/**
 * Response body for `POST /internal/agent_builder/sml/_search` (internal only).
 */
export interface SmlSearchHttpResponse {
  total: number;
  results: SmlSearchHttpResultItem[];
  /**
   * Ready-to-inject memory context prompt (instructions + formatted hits).
   * Only present when `include_prompt: true` was set in the request.
   */
  prompt?: string;
}

/**
 * One SML search hit returned to the browser — aligned with server `SmlDocument` and the `sml_search` tool output.
 * When the request sets `skip_content: true`, `content` is omitted to shrink the payload (e.g. autocomplete).
 */
export interface SmlSearchHttpResultItem {
  /** SML chunk document id (Elasticsearch `_id` for the chunk row). Alias for `id`. */
  chunk_id: string;
  /** SML chunk document id (Elasticsearch `_id` for the chunk row). */
  id: string;
  /** Registered SML type id (e.g. `visualization`, `dashboard`). */
  type: string;
  /** Origin asset id (e.g. saved object id). Alias for `origin_id`. */
  item_id: string;
  /** Origin asset id (e.g. saved object id); matches stored `origin_id`. */
  origin_id: string;
  title: string;
  score: number;
  /** Indexed searchable text; omitted when `skip_content` was true on the request. */
  content?: string;
  /** True when the indexed content exceeds the 200-character preview length. */
  has_more: boolean;
  /** ISO timestamp when this chunk was first created. */
  created_at: string;
  /** Whether this item can be attached to a conversation via `sml_attach`. */
  attachable: boolean;
}

/**
 * Response body for `POST /internal/agent_builder/sml/_attach` (internal only).
 */
export interface SmlAttachHttpResponse {
  results: SmlAttachHttpResultItem[];
}

export type SmlAttachHttpResultItem = SmlAttachHttpSuccessItem | SmlAttachHttpErrorItem;

export interface SmlAttachHttpSuccessItem {
  success: true;
  chunk_id: string;
  conversation_attachment_id: string;
  attachment_type: string;
  message: string;
}

export interface SmlAttachHttpErrorItem {
  success: false;
  chunk_id: string;
  attachment_type?: string;
  message: string;
}
