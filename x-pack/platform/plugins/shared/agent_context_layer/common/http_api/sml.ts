/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}

/**
 * Response body for `GET /internal/agent_context_layer/sml/{id}`.
 */
export interface SmlGetHttpResponse {
  item: SmlHttpItem;
}

/**
 * Default and maximum `per_page` values for the list endpoint.
 */
export const SML_HTTP_LIST_PER_PAGE_DEFAULT = 20;
export const SML_HTTP_LIST_PER_PAGE_MAX = 1000;
export const SML_HTTP_LIST_PAGE_DEFAULT = 1;

/**
 * Response body for `GET /internal/agent_context_layer/sml`.
 */
export interface SmlListHttpResponse {
  total: number;
  page: number;
  per_page: number;
  items: SmlHttpItem[];
}

/**
 * Body for `PUT /internal/agent_context_layer/sml/{id}`.
 */
export interface SmlUpsertHttpRequestBody {
  type: string;
  title: string;
  origin_id: string;
  content: string;
  spaces: string[];
  permissions?: string[];
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
