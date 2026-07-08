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
 * Applied by call wrappers (e.g. agent SO `connector_ids`), not exposed to the
 * LLM. Keys must be values of {@link SmlSearchFilterType}. Per-type constraints
 * compose with OR across types (a record passes if its type has no constraint
 * or the record's origin id is in the allowlist).
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
