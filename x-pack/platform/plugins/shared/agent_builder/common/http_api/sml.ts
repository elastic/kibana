/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max items per `POST /internal/agent_builder/sml/_attach` (matches `sml_attach` tool). */
export const SML_HTTP_ATTACH_ITEMS_MAX = 50;

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

// --- Search ---

/** Max length of `query` for `POST /internal/agent_builder/sml/_search`. */
export const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/** Response body for `POST /internal/agent_builder/sml/_search`. */
export interface SmlSearchHttpResponse {
  results: SmlSearchHttpResultItem[];
}

export interface SmlSearchHttpResultItem {
  id: string;
  type: string;
  origin: { uri: string };
  title: string;
  description?: string;
  content?: string;
  references?: Array<{ uri: string }>;
  tags?: string[];
}

// --- Autocomplete ---

/** Max length of `query` for `POST /internal/agent_builder/sml/_autocomplete`. */
export const SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH = 256;

/** Response body for `POST /internal/agent_builder/sml/_autocomplete`. */
export interface SmlAutocompleteHttpResponse {
  results: SmlAutocompleteHttpResultItem[];
}

export interface SmlAutocompleteHttpResultItem {
  id: string;
  type: string;
  origin: { uri: string };
  title: string;
  matched_discovery_labels?: SmlMatchedDiscoveryLabel[];
}

export interface SmlMatchedDiscoveryLabel {
  value: string;
  kind: string;
  highlighted?: string;
}
