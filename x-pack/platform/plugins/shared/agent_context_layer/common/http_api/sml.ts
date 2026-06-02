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
 * Wire representation of a single SML object.
 *
 * Mirrors the server-side `SmlDocument` shape used by the storage layer.
 */
export interface SmlHttpItem {
  id: string;
  type: string;
  title: string;
  origin_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  spaces: string[];
  permissions: string[];
  /** How this chunk was produced. */
  ingestion_method: 'manual' | 'crawled';
}

/**
 * Response body for `GET /internal/agent_context_layer/sml/{id}`.
 */
export interface SmlGetHttpResponse {
  item: SmlHttpItem;
}

/**
 * Default and maximum `per_page` values for the list endpoint.
 *
 * Deeper pagination is bounded at runtime by the index's
 * `index.max_result_window` setting (default 10000); requests that exceed it
 * are rejected with HTTP 400.
 */
export const SML_HTTP_LIST_PER_PAGE_DEFAULT = 20;
export const SML_HTTP_LIST_PER_PAGE_MAX = 1000;
export const SML_HTTP_LIST_PAGE_DEFAULT = 1;

/**
 * Response body for `GET /internal/agent_context_layer/sml`.
 */
export interface SmlListHttpResponse {
  page: number;
  per_page: number;
  items: SmlHttpItem[];
}

/**
 * Response body for `PUT /internal/agent_context_layer/sml/{id}`.
 */
export interface SmlUpsertHttpResponse {
  item: SmlHttpItem;
  /** Whether the document was newly created (vs. updated in place). */
  created: boolean;
}

/**
 * Response body for `DELETE /internal/agent_context_layer/sml/{id}`.
 */
export interface SmlDeleteHttpResponse {
  id: string;
  deleted: boolean;
}
