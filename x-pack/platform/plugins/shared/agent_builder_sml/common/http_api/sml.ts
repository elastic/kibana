/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowed type keys for the runtime-imposed `constraints` parameter in SML search.
 * Extend this enum when adding new constrainable SML types.
 */
export enum SmlSearchFilterType {
  connector = 'connector',
}

/**
 * Runtime-imposed, per-type id-allowlist constraints for SML search.
 *
 * Applied transparently by call wrappers from the caller's context (e.g. agent
 * SO `connector_ids`, future allowed-indices, allowed-skills, RBAC). Not
 * exposed to the LLM — the agent can't bypass constraints by construction.
 *
 * Keys must be values of {@link SmlSearchFilterType}.
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
export type SmlSearchConstraints = Partial<Record<SmlSearchFilterType, { ids?: string[] }>>;

/**
 * Agent-discoverable refinements for SML search.
 *
 * Exposed in the LLM tool input schema; the agent picks which (if any) to
 * supply. Combined with {@link SmlSearchConstraints} server-side — agent filters
 * never widen the runtime-imposed constraints.
 */
export interface SmlSearchFilters {
  /** Restrict to one or more SML types (ANY semantics; matches if `type` is in the list). */
  types?: string[];
  /** Restrict to records with any of these tags (ANY semantics; `terms` clause on `tags`). */
  tags?: string[];
}

/**
 * Max length of `query` for POST `/internal/agent_builder_sml/sml/_search`.
 */
export const SML_HTTP_SEARCH_QUERY_MAX_LENGTH = 512;

/**
 * Response body for `POST /internal/agent_builder_sml/sml/_search`.
 */
export interface SmlSearchHttpResponse {
  results: SmlSearchHttpResultItem[];
}

/**
 * Per-hit shape returned by `POST /sml/_search`.
 * Baseline always includes id, type, title, origin, description. Optional fields
 * (content, tags, references, spaces, permissions) are included only when
 * explicitly requested via the `fields[]` parameter.
 */
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

/**
 * Max length of `query` for POST `/internal/agent_builder_sml/sml/_autocomplete`.
 * Autocomplete payloads are user-typed prefixes - shorter than full retrieval queries.
 */
export const SML_HTTP_AUTOCOMPLETE_QUERY_MAX_LENGTH = 256;

/**
 * Response body for `POST /internal/agent_builder_sml/sml/_autocomplete`.
 */
export interface SmlAutocompleteHttpResponse {
  results: SmlAutocompleteHttpResultItem[];
}

/**
 * One row in the @ menu / typeahead. Results are returned in score order;
 * consumers iterate without re-sorting.
 */
export interface SmlAutocompleteHttpResultItem {
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
  matched_discovery_labels?: SmlMatchedDiscoveryLabel[];
}

interface SmlMatchedDiscoveryLabel {
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
