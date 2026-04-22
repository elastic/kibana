/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Max length of `query` for POST `/internal/semantic_layer/sml/_search`.
 * The agent `sml_search` tool uses its own separate limit in its Zod schema.
 */
export const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/**
 * Response body for `POST /internal/semantic_layer/sml/_search`.
 */
export interface SmlSearchHttpResponse {
  total: number;
  results: SmlSearchHttpResultItem[];
}

/**
 * One SML search hit returned to the browser.
 * When the request sets `skip_content: true`, `content` is omitted to shrink the payload.
 */
export interface SmlSearchHttpResultItem {
  id: string;
  type: string;
  origin_id: string;
  title: string;
  score: number;
  content?: string;
}
