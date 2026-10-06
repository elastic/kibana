/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EUID translation layer: helpers that depend on entity definitions and streamlang.
 * Import from here when you need euid DSL/ESQL/Painless. For entity types use common (index).
 * Do not import this file from plugin public (browser) code synchronously — it pulls in @kbn/streamlang.
 * For browser bundles, load the same {@link euid} object via dynamic import (`euid_browser` / `loadEuidApi()`).
 *
 * @example
 * import { euid } from '@kbn/entity-store/common/euid_helpers';
 * euid.getEuidFromObject('host', doc);
 * euid.dsl.getEuidDocumentsContainsIdFilter('host');
 */

import * as euidModule from './domain/euid';

export const euid = {
  /**
   * Resolves the entity unique id (EUID) for one document using entity definitions (in-memory only).
   * Input: entity type (e.g. `user`) and a document body like ES `_source` (nested or flattened).
   * Output: EUID string such as `user:…` / `host:…`, or `undefined` when no id can be derived.
   * Applies the creation gate, so it answers whether a document may create an entity.
   */
  getEuidFromObject: euidModule.getEuidFromObject,
  /**
   * Like {@link euid.getEuidFromObject}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEuidFromObjectFromDefinition: euidModule.getEuidFromObjectFromDefinition,
  /**
   * Like {@link euid.getEuidFromObject} without the creation gate, so IdP and shared-account
   * documents still resolve to entities that already exist. For risk scoring and enrichment;
   * the caller checks store membership.
   */
  getEuidFromObjectForSearch: euidModule.getEuidFromObjectForSearch,
  /**
   * Like {@link euid.getEuidFromObjectForSearch}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEuidFromObjectForSearchFromDefinition: euidModule.getEuidFromObjectForSearchFromDefinition,
  /**
   * Flat map of ECS field → scalar value for the winning identity branch (same pipeline as {@link euid.getEuidFromObject}).
   * Use to seed flyouts, filters, and resolution when you need field-level context, not only the composed EUID string.
   */
  getEntityIdentifiersFromDocument: euidModule.getEntityIdentifiersFromDocument,
  /**
   * Like {@link euid.getEntityIdentifiersFromDocument}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEntityIdentifiersFromDocumentFromDefinition:
    euidModule.getEntityIdentifiersFromDocumentFromDefinition,
  /**
   * Builds EUID from Timeline “non-ECS” row arrays (field + value[]) without importing timelines types.
   */
  getEuidFromTimelineNonEcsData: euidModule.getEuidFromTimelineNonEcsData,
  /**
   * Like {@link euid.getEuidFromTimelineNonEcsData}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEuidFromTimelineNonEcsDataFromDefinition:
    euidModule.getEuidFromTimelineNonEcsDataFromDefinition,
  /**
   * Returns which source fields are read for EUID for an entity type (`requiresOneOf`, full `identitySourceFields` list).
   * Exposed so UIs and CRUD can request minimal `_source` or validate partial documents.
   */
  getEuidSourceFields: euidModule.getEuidSourceFields,
  /**
   * Like {@link euid.getEuidSourceFields}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEuidSourceFieldsFromDefinition: euidModule.getEuidSourceFieldsFromDefinition,

  /**
   * Returns the namespace source fields for an entity type, split by match kind.
   * `exactMatchFields` are matched with a term query (e.g. `event.module`).
   * `prefixMatchFields` are matched with a prefix query because the entity store splits on a
   * delimiter (e.g. `data_stream.dataset` → prefix `gcp` matches `gcp.audit`, `gcp.firewall`).
   * Use this when translating EUID DSL to Kibana filter operators: replace prefix clauses on
   * `prefixMatchFields` with exact phrase filters built from the raw observed field values.
   */
  getEuidNamespaceSourceFields: euidModule.getEuidNamespaceSourceFields,
  /**
   * Like {@link euid.getEuidNamespaceSourceFields}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getEuidNamespaceSourceFieldsFromDefinition: euidModule.getEuidNamespaceSourceFieldsFromDefinition,

  /**
   * Reduces an observed namespace source value to the prefix the entity definition derives from it
   * (e.g. `data_stream.dataset: "okta.system"` → `okta`), or `undefined` when the field is not a
   * prefix-matched source. Splits on the source's own `splitBy`, so comparing the result to an arm
   * is not the same as a `startsWith` test — use this instead of reimplementing the split.
   */
  getNamespaceSourcePrefix: euidModule.getEuidNamespaceSourcePrefix,
  /**
   * Like {@link euid.getNamespaceSourcePrefix}, but takes a definition (for example from the server-side registry) instead of a type name.
   */
  getNamespaceSourcePrefixFromDefinition: euidModule.getEuidNamespaceSourcePrefixFromDefinition,

  /**
   * Painless-backed EUID helpers for runtime fields and scripts (same semantics as `getEuidFromObject`).
   */
  painless: {
    /**
     * Builds the Painless expression text that computes the same EUID as `getEuidFromObject` at search time.
     * Input: entity type. Output: a Painless snippet string to embed in scripts or runtime fields.
     * Applies the creation gate, so it answers whether a document may create an entity.
     */
    getEuidEvaluation: euidModule.getEuidPainlessEvaluation,
    /**
     * Like {@link euid.painless.getEuidEvaluation}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidEvaluationFromDefinition: euidModule.getEuidPainlessEvaluationFromDefinition,

    /**
     * Like {@link euid.painless.getEuidEvaluation} without the creation gate, so IdP and
     * shared-account documents still resolve to entities that already exist. For risk scoring
     * and enrichment; the caller checks store membership.
     */
    getEuidEvaluationForSearch: euidModule.getEuidPainlessEvaluationForSearch,
    /**
     * Like {@link euid.painless.getEuidEvaluationForSearch}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidEvaluationForSearchFromDefinition:
      euidModule.getEuidPainlessEvaluationForSearchFromDefinition,

    /**
     * Elasticsearch `runtime_mappings` entry that exposes the EUID as a `keyword` runtime field (`entity_id`).
     * Input: entity type. Output: mapping object suitable for the Search API `runtime_mappings` map.
     */
    getEuidRuntimeMapping: euidModule.getEuidPainlessRuntimeMapping,
    /**
     * Like {@link euid.painless.getEuidRuntimeMapping}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidRuntimeMappingFromDefinition: euidModule.getEuidPainlessRuntimeMappingFromDefinition,
  },

  /**
   * ESQL strings for extraction pipelines and `WHERE` clauses (aligned with entity definitions).
   */
  esql: {
    /**
     * Broad predicate: documents allowed into the entity pipeline and that could carry an EUID for this type.
     * Input: entity type only. Output: ESQL boolean fragment for `WHERE` (no leading `WHERE`).
     */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidEsqlDocumentsContainsIdFilter,
    /**
     * Like {@link euid.esql.getEuidDocumentsContainsIdFilter}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidDocumentsContainsIdFilterFromDefinition:
      euidModule.getEuidEsqlDocumentsContainsIdFilterFromDefinition,

    /**
     * Full ESQL expression used in extraction to compute the typed EUID (e.g. inside `EVAL` / `STATS`).
     * Input: entity type. Output: ESQL expression string (often a `CONCAT`/`CASE` around identity fields).
     */
    getEuidEvaluation: euidModule.getEuidEsqlEvaluation,
    /**
     * Like {@link euid.esql.getEuidEvaluation}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidEvaluationFromDefinition: euidModule.getEuidEsqlEvaluationFromDefinition,

    /**
     * ESQL predicate that locates documents matching one sample document's identity (mirrors per-doc DSL).
     * Input: entity type and sample document; output: parenthesized boolean expression or `undefined` if not buildable.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,
    /**
     * Like {@link euid.esql.getEuidFilterBasedOnDocument}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidFilterBasedOnDocumentFromDefinition:
      euidModule.getEuidEsqlFilterBasedOnDocumentFromDefinition,

    /**
     * Returns the ESQL `EVAL` expressions for field evaluations (e.g. entity.namespace derivation).
     * Input: entity type. Output: ESQL expression string for `EVAL`, or `undefined` if none defined.
     */
    getFieldEvaluations: euidModule.getFieldEvaluationsEsql,
    /**
     * Like {@link euid.esql.getFieldEvaluations}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getFieldEvaluationsFromDefinition: euidModule.getFieldEvaluationsEsqlFromDefinition,
  },

  /**
   * Elasticsearch Query DSL for filters and searches (aligned with entity definitions).
   */
  dsl: {
    /**
     * Query DSL that should match documents sharing the same identity fields as the given sample document.
     * Input: entity type and one document; output: bool/term-style filter, or `undefined` if identity or pipeline gate fails.
     * Pass `{ excludeHigherRankedFields: false }` when looking up a stored entity by partial identity
     * (e.g. only `host.name`) — the default partition semantics would require higher-ranked fields
     * (e.g. `host.id`) to be absent and never match stored entities.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidDslFilterBasedOnDocument,
    /**
     * Like {@link euid.dsl.getEuidFilterBasedOnDocument}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidFilterBasedOnDocumentFromDefinition:
      euidModule.getEuidDslFilterBasedOnDocumentFromDefinition,

    /**
     * Query DSL that matches raw source documents belonging to an already-resolved entity-store record.
     * Trusts the record's resolved evaluated fields (e.g. `entity.namespace`) and reverse-maps them to
     * raw source-field conditions, so IdP users resolve correctly even though the record does not retain
     * `event.module` / `data_stream.dataset`. Input: entity type and one entity-store record; output:
     * bool/term-style filter, or `undefined` if the record lacks enough identity.
     */
    getEuidFilterBasedOnEntityRecord: euidModule.getEuidDslFilterBasedOnEntityRecord,
    /**
     * Like {@link euid.dsl.getEuidFilterBasedOnEntityRecord}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidFilterBasedOnEntityRecordFromDefinition:
      euidModule.getEuidDslFilterBasedOnEntityRecordFromDefinition,

    /**
     * Broad DSL filter: documents that may participate in the entity pipeline and could have an EUID for this type.
     * Input: entity type only. Output: query DSL equivalent to documentsFilter (and postAgg when defined).
     */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidDslDocumentsContainsIdFilter,
    /**
     * Like {@link euid.dsl.getEuidDocumentsContainsIdFilter}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidDocumentsContainsIdFilterFromDefinition:
      euidModule.getEuidDslDocumentsContainsIdFilterFromDefinition,
  },
  kql: {
    /**
     * KQL that should match documents sharing the same identity fields as the given sample document.
     * Input: entity type and one document; output: KQL, or `undefined` if identity or pipeline gate fails.
     */
    getEuidFilterBasedOnDocument: euidModule.getEuidKqlFilterBasedOnDocument,
    /**
     * Like {@link euid.kql.getEuidFilterBasedOnDocument}, but takes a definition (for example from the server-side registry) instead of a type name.
     */
    getEuidFilterBasedOnDocumentFromDefinition:
      euidModule.getEuidKqlFilterBasedOnDocumentFromDefinition,
  },

  /**
   * Narrow-purpose helpers that trade generality for speed by hardcoding an
   * assumption the general API derives at query time. **Each is correct only for
   * callers whose data satisfies its documented precondition** — violate it and you
   * get plausible-looking EUIDs that no entity-store record matches, so every write
   * 404s silently.
   *
   * Reach for the equivalent under `esql` / `dsl` / `kql` unless you have measured
   * evidence that the general path is too slow AND can state why the precondition
   * holds for every document your query reads.
   */
  experimental: {
    /**
     * Minimal ESQL fragments (`{ evalAssignment, presenceGate }`) for the host-scoped
     * (non-IDP) user EUID `user:<user.name>@<host.id>@local`, skipping the
     * `entity.namespace` derivation.
     */
    getHostScopedUserEuidEsql: euidModule.getHostScopedUserEuidEsql,
  },
};

/** Full EUID API (memory + painless + esql + dsl) — same object for Node and browser lazy chunk. */
export type EntityStoreEuid = typeof euid;

/**
 * EUID API surface passed through the entity_store plugin React context and `loadEuidApi()`.
 * Aligns with the {@link euid} object from this module.
 */
export interface EntityStoreEuidApi {
  euid: EntityStoreEuid;
}
