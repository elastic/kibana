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

/**
 * Response body for `POST /internal/agent_builder/sml/_search` (internal only).
 */
export interface SmlSearchHttpResponse {
  total: number;
  results: SmlSearchHttpResultItem[];
}

/**
 * One SML search hit returned to the browser — aligned with server `SmlDocument` (`id`, `origin_id`, `type`, …).
 * When the request sets `skip_content: true`, `content` is omitted to shrink the payload (e.g. autocomplete).
 */
export interface SmlSearchHttpResultItem {
  /** SML chunk document id (Elasticsearch `_id` for the chunk row). */
  id: string;
  /** Registered SML type id (e.g. `visualization`, `dashboard`). */
  type: string;
  /** Origin asset id (e.g. saved object id); matches stored `origin_id`. */
  origin_id: string;
  title: string;
  score: number;
  /** Indexed searchable text; omitted when `skip_content` was true on the request. */
  content?: string;
}
