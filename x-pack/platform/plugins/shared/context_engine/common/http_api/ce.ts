/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowed type keys for the runtime-imposed `constraints` parameter in CE search.
 * Extend this enum when adding new constrainable CE types.
 */
export enum CeSearchFilterType {
  connector = 'connector',
}

/**
 * Runtime-imposed, per-type id-allowlist constraints for CE search.
 *
 * Applied transparently by call wrappers from the caller's context (e.g. agent
 * SO `connector_ids`, future allowed-indices, allowed-skills, RBAC). Not
 * exposed to the LLM — the agent can't bypass constraints by construction.
 *
 * Keys must be values of {@link CeSearchFilterType}.
 *
 * **Cross-type semantics:** constraints compose with OR across types — a record
 * satisfies constraints if it passes the constraint for its own type (or has no
 * constraint for its type). Because a record has exactly one type, per-type
 * constraints are always mutually exclusive on any given hit; AND semantics
 * across types are not expressible and not needed.
 *
 * **Complexity limit:** this shape intentionally supports only id-allowlists.
 * More complex runtime constraints (capability-based, classification-based, etc.)
 * must be pre-computed into a flat list of allowed IDs before being passed here,
 * or handled as a separate named parameter on the service call.
 */
export type CeSearchConstraints = Partial<Record<CeSearchFilterType, { ids?: string[] }>>;

/**
 * Agent-discoverable refinements for CE search.
 *
 * Exposed in the LLM tool input schema; the agent picks which (if any) to
 * supply. Combined with {@link CeSearchConstraints} server-side — agent filters
 * never widen the runtime-imposed constraints.
 */
export interface CeSearchFilters {
  /** Restrict to one or more CE types (ANY semantics; matches if `type` is in the list). */
  types?: string[];
  /** Restrict to records with any of these tags (ANY semantics; `terms` clause on `tags`). */
  tags?: string[];
}

/**
 * Max length of `query` for POST `/internal/context_engine/ce/_search`.
 */
export const CE_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/**
 * Response body for `POST /internal/context_engine/ce/_search`.
 */
export interface CeSearchHttpResponse {
  results: CeSearchHttpResultItem[];
}

/**
 * Per-hit shape returned by `POST /ce/_search`.
 * Baseline always includes id, type, title, origin, description. Optional fields
 * (content, tags, references, spaces, permissions) are included only when
 * explicitly requested via the `fields[]` parameter.
 */
export interface CeSearchHttpResultItem {
  id: string;
  type: string;
  origin: { uri: string };
  title: string;
  description?: string;
  content?: string;
  references?: Array<{ uri: string }>;
  tags?: string[];
}

/**
 * Wire representation of a single CE object.
 *
 * Mirrors the server-side `CeDocument` shape used by the storage layer.
 */
export interface CeHttpItem {
  id: string;
  type: string;
  title: string;
  origin: { uri: string };
  content: string;
  created_at: string;
  updated_at: string;
  spaces: string[];
  tags: string[];
  /**
   * Permissions required to access the underlying element. Always
   * present; inner arrays may be empty.
   */
  permissions: {
    kibana: { privileges: Array<{ name: string }> };
    elasticsearch: { indices: Array<{ name: string }> };
  };
  /** How this entry was produced. */
  ingestion_method: 'manual' | 'crawled';
}

/**
 * Response body for `GET /internal/context_engine/ce/{originId}`.
 *
 * Returns every entry written under the origin (the workflow step's
 * content mode can write multiple entries per origin, the crawler may
 * write one, etc.). Consumers iterate; ordering is not guaranteed.
 * `items` is empty (not 404) is impossible — when no entries exist or
 * none are visible to the caller, the route returns 404 directly.
 */
export interface CeGetHttpResponse {
  items: CeHttpItem[];
}

/**
 * Default and maximum `per_page` values for the list endpoint.
 *
 * Deeper pagination is bounded at runtime by the index's
 * `index.max_result_window` setting (default 10000); requests that exceed it
 * are rejected with HTTP 400.
 */
export const CE_HTTP_LIST_PER_PAGE_DEFAULT = 20;
export const CE_HTTP_LIST_PER_PAGE_MAX = 1000;
export const CE_HTTP_LIST_PAGE_DEFAULT = 1;

/**
 * Response body for `GET /internal/context_engine/ce`.
 */
export interface CeListHttpResponse {
  page: number;
  per_page: number;
  items: CeHttpItem[];
}

/**
 * Response body for `PUT /internal/context_engine/ce/{originId}`.
 *
 * PUT writes a single manual entry under `originId` via the indexer's
 * content mode. The indexer wipes every existing entry for the origin
 * (regardless of `ingestion_method`) before writing — HTTP PUT therefore
 * effectively claims ownership of the origin and replaces any
 * crawler-written entries for it. `items` reflects what the indexer
 * actually persisted (currently always one entry for the HTTP path).
 */
export interface CeUpsertHttpResponse {
  items: CeHttpItem[];
  /** Whether the origin was newly created (vs. replacing existing entries). */
  created: boolean;
}

/**
 * Response body for `DELETE /internal/context_engine/ce/{originId}`.
 *
 * DELETE removes every entry for the origin (manual + crawled) via the
 * indexer's `deleteAttachment({ ingestionMethod: 'all' })`. Mirrors PUT's
 * "claim the origin" semantic in reverse.
 */
export interface CeDeleteHttpResponse {
  origin_id: string;
  deleted: boolean;
}

/**
 * Max length of `query` for POST `/internal/context_engine/ce/_autocomplete`.
 * Autocomplete payloads are user-typed prefixes - shorter than full retrieval queries.
 */
export const CE_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH = 256;

/**
 * Response body for `POST /internal/context_engine/ce/_autocomplete`.
 */
export interface CeAutocompleteHttpResponse {
  results: CeAutocompleteHttpResultItem[];
}

/**
 * One row in the @ menu / typeahead. Results are returned in score order;
 * consumers iterate without re-sorting.
 */
export interface CeAutocompleteHttpResultItem {
  id: string;
  type: string;
  origin: { uri: string };
  title: string;
  /**
   * The specific `discovery_labels` entries that matched the typed prefix,
   * with their `kind` so the UI can render the matched label in context
   * (e.g. for `kind: 'title'` the UI may bold the matched span in the title;
   * for `kind: 'tagline'` it may render the value as a chip).
   *
   * Title and type are reachable as discovery_labels (indexer auto-prepends
   * `{value: title, kind: 'title'}` and `{value: type, kind: 'type'}`).
   */
  matched_discovery_labels?: CeMatchedDiscoveryLabel[];
}

export interface CeMatchedDiscoveryLabel {
  value: string;
  kind: string;
  /**
   * The matched span within `value`, wrapped in `<em>...</em>` tags. Present
   * when ES returned a highlight snippet for this entry. UI renders the tags
   * as appropriate (e.g. mapping `<em>` to a bolded span). Example: typed
   * prefix `"git"` against value `"github"` produces `"<em>git</em>hub"`.
   */
  highlighted?: string;
}
