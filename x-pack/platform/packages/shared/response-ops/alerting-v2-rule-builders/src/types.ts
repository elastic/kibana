/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Query } from '@kbn/alerting-v2-schemas';

/**
 * `metadata.builder_fields` as it arrives over the API, before the owning
 * builder's schema gives it a shape. Only the registry handles values at this
 * type; a builder always receives its own validated fields.
 */
export type OpaqueBuilderFields = Record<string, unknown>;

/**
 * Everything a builder derives from its `builder_fields`. `query` is the only
 * required part; `grouping` and `time_field` are returned when the builder owns
 * them, in which case they override whatever the client sent so a stored rule
 * can never disagree with its own generated query.
 */
export interface GeneratedQuery {
  query: Query;
  grouping?: { fields: string[] };
  time_field?: string;
}

/**
 * Pure-data definition supplied by the owning plugin via `registerBuilderType`.
 * Deliberately free of React and Kibana runtime types so the same definition can
 * be evaluated on the server, where the query is actually generated.
 */
export interface BuilderTypeDefinition<TFields extends object = OpaqueBuilderFields> {
  /**
   * Builder identifier. MUST equal `metadata.builder_type` on rules authored by
   * this builder (e.g. `threshold`). NOT a saved-object type.
   */
  type: string;
  /**
   * Validates `metadata.builder_fields`. Must be fully bounded (every string
   * `.max()`, every array `.max()`, objects `.strict()`, no `z.any()` /
   * `z.unknown()`). Enforced at registration.
   */
  builderFieldsSchema: z.ZodType<TFields>;
  /**
   * Derives the rule query from already-validated fields. Must be deterministic:
   * the stored query is regenerated on every write, so a non-deterministic
   * implementation would produce spurious rule versions.
   */
  generateQuery: (fields: TFields) => GeneratedQuery;
}

/**
 * A definition with its field type erased, which is what a registry holds — it
 * is heterogeneous, so it cannot name each builder's fields. Safe because the
 * registry only ever calls `generateQuery` with the output of the same
 * definition's `builderFieldsSchema`.
 */
export type RegisteredBuilderType = BuilderTypeDefinition<OpaqueBuilderFields>;

/**
 * Erases the field type of a definition while type-checking its internals, so a
 * builder is authored against its concrete fields yet still fits a
 * heterogeneous registry.
 */
export const defineBuilderType = <TFields extends object>(
  definition: BuilderTypeDefinition<TFields>
): RegisteredBuilderType => definition as unknown as RegisteredBuilderType;
