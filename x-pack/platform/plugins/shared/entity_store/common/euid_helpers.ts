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
 * Every helper comes in two forms. The `...FromDefinition` form takes an entity definition, so it
 * works for any definition, including those other plugins register in the entity definition
 * registry. The form that takes a type name is a shortcut for the Entity Store's own built-in
 * definitions (`user`, `host`, `service`, `generic`): it resolves the definition by name and
 * calls the `...FromDefinition` form. Any other name is a type error, and throws at runtime if
 * it gets past the types.
 *
 * @example
 * import { euid } from '@kbn/entity-store/common/euid_helpers';
 * // One of the four built-ins, by name:
 * euid.getEuidFromObject('host', doc);
 * // Any definition, for example one read from the registry on the server:
 * const definition = await entityStore.getEntityDefinitionsClientForSpace(space).get('k8s.pod');
 * euid.getEuidFromObjectFromDefinition(definition, doc);
 * euid.esql.getEuidEvaluationFromDefinition(definition, 'entity.id');
 */

import * as euidModule from './domain/euid';

export const euid = {
  /** {@link euid.getEuidFromObjectFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEuidFromObject: euidModule.getEuidFromObject,
  /**
   * Resolves the entity unique id (EUID) for one document in JavaScript, with no Elasticsearch
   * round trip (the Painless, ES|QL and DSL forms below produce query fragments instead).
   * Input: an entity definition and a document body like ES `_source` (nested or flattened).
   * Output: EUID string such as `user:…` / `host:…`, or `undefined` when no id can be derived.
   * Applies the creation gate, so it answers whether a document may create an entity.
   */
  getEuidFromObjectFromDefinition: euidModule.getEuidFromObjectFromDefinition,
  /** {@link euid.getEuidFromObjectForSearchFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEuidFromObjectForSearch: euidModule.getEuidFromObjectForSearch,
  /**
   * Like {@link euid.getEuidFromObjectFromDefinition} without the creation gate, so IdP and shared-account
   * documents still resolve to entities that already exist. For risk scoring and enrichment;
   * the caller checks store membership.
   */
  getEuidFromObjectForSearchFromDefinition: euidModule.getEuidFromObjectForSearchFromDefinition,
  /** {@link euid.getEntityIdentifiersFromDocumentFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEntityIdentifiersFromDocument: euidModule.getEntityIdentifiersFromDocument,
  /**
   * Flat map of ECS field → scalar value for the winning identity branch (same pipeline as {@link euid.getEuidFromObjectFromDefinition}).
   * Use to seed flyouts, filters, and resolution when you need field-level context, not only the composed EUID string.
   */
  getEntityIdentifiersFromDocumentFromDefinition:
    euidModule.getEntityIdentifiersFromDocumentFromDefinition,
  /** {@link euid.getEuidFromTimelineNonEcsDataFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEuidFromTimelineNonEcsData: euidModule.getEuidFromTimelineNonEcsData,
  /**
   * Builds EUID from Timeline “non-ECS” row arrays (field + value[]) without importing timelines types.
   */
  getEuidFromTimelineNonEcsDataFromDefinition:
    euidModule.getEuidFromTimelineNonEcsDataFromDefinition,
  /** {@link euid.getEuidSourceFieldsFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEuidSourceFields: euidModule.getEuidSourceFields,
  /**
   * Returns which source fields are read for EUID for an entity definition (`requiresOneOf`, full `identitySourceFields` list).
   * Exposed so UIs and CRUD can request minimal `_source` or validate partial documents.
   */
  getEuidSourceFieldsFromDefinition: euidModule.getEuidSourceFieldsFromDefinition,

  /** {@link euid.getEuidNamespaceSourceFieldsFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getEuidNamespaceSourceFields: euidModule.getEuidNamespaceSourceFields,
  /**
   * Returns the namespace source fields for an entity definition, split by match kind.
   * `exactMatchFields` are matched with a term query (e.g. `event.module`).
   * `prefixMatchFields` are matched with a prefix query because the entity store splits on a
   * delimiter (e.g. `data_stream.dataset` → prefix `gcp` matches `gcp.audit`, `gcp.firewall`).
   * Use this when translating EUID DSL to Kibana filter operators: replace prefix clauses on
   * `prefixMatchFields` with exact phrase filters built from the raw observed field values.
   */
  getEuidNamespaceSourceFieldsFromDefinition: euidModule.getEuidNamespaceSourceFieldsFromDefinition,

  /** {@link euid.getNamespaceSourcePrefixFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
  getNamespaceSourcePrefix: euidModule.getEuidNamespaceSourcePrefix,
  /**
   * Reduces an observed namespace source value to the prefix the entity definition derives from it
   * (e.g. `data_stream.dataset: "okta.system"` → `okta`), or `undefined` when the field is not a
   * prefix-matched source. Splits on the source's own `splitBy`, so comparing the result to an arm
   * is not the same as a `startsWith` test — use this instead of reimplementing the split.
   */
  getNamespaceSourcePrefixFromDefinition: euidModule.getEuidNamespaceSourcePrefixFromDefinition,

  /**
   * Painless-backed EUID helpers for runtime fields and scripts (same semantics as `getEuidFromObject`).
   */
  painless: {
    /** {@link euid.painless.getEuidEvaluationFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidEvaluation: euidModule.getEuidPainlessEvaluation,
    /**
     * Builds the Painless expression text that computes the same EUID as `getEuidFromObjectFromDefinition` at search time.
     * Input: an entity definition. Output: a Painless snippet string to embed in scripts or runtime fields.
     * Applies the creation gate, so it answers whether a document may create an entity.
     */
    getEuidEvaluationFromDefinition: euidModule.getEuidPainlessEvaluationFromDefinition,

    /** {@link euid.painless.getEuidEvaluationForSearchFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidEvaluationForSearch: euidModule.getEuidPainlessEvaluationForSearch,
    /**
     * Like {@link euid.painless.getEuidEvaluationFromDefinition} without the creation gate, so IdP and
     * shared-account documents still resolve to entities that already exist. For risk scoring
     * and enrichment; the caller checks store membership.
     */
    getEuidEvaluationForSearchFromDefinition:
      euidModule.getEuidPainlessEvaluationForSearchFromDefinition,

    /** {@link euid.painless.getEuidRuntimeMappingFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidRuntimeMapping: euidModule.getEuidPainlessRuntimeMapping,
    /**
     * Elasticsearch `runtime_mappings` entry that exposes the EUID as a `keyword` runtime field (`entity_id`).
     * Input: an entity definition. Output: mapping object suitable for the Search API `runtime_mappings` map.
     */
    getEuidRuntimeMappingFromDefinition: euidModule.getEuidPainlessRuntimeMappingFromDefinition,
  },

  /**
   * ESQL strings for extraction pipelines and `WHERE` clauses (aligned with entity definitions).
   */
  esql: {
    /** {@link euid.esql.getEuidDocumentsContainsIdFilterFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidEsqlDocumentsContainsIdFilter,
    /**
     * Broad predicate: documents allowed into the entity pipeline and that could carry an EUID for the definition's type.
     * Input: an entity definition only. Output: ESQL boolean fragment for `WHERE` (no leading `WHERE`).
     */
    getEuidDocumentsContainsIdFilterFromDefinition:
      euidModule.getEuidEsqlDocumentsContainsIdFilterFromDefinition,

    /** {@link euid.esql.getEuidEvaluationFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidEvaluation: euidModule.getEuidEsqlEvaluation,
    /**
     * Full ESQL expression used in extraction to compute the typed EUID (e.g. inside `EVAL` / `STATS`).
     * Input: an entity definition. Output: ESQL expression string (often a `CONCAT`/`CASE` around identity fields).
     */
    getEuidEvaluationFromDefinition: euidModule.getEuidEsqlEvaluationFromDefinition,

    /** {@link euid.esql.getEuidFilterBasedOnDocumentFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidFilterBasedOnDocument: euidModule.getEuidEsqlFilterBasedOnDocument,
    /**
     * ESQL predicate that locates documents matching one sample document's identity (mirrors per-doc DSL).
     * Input: an entity definition and sample document; output: parenthesized boolean expression or `undefined` if not buildable.
     */
    getEuidFilterBasedOnDocumentFromDefinition:
      euidModule.getEuidEsqlFilterBasedOnDocumentFromDefinition,

    /** {@link euid.esql.getFieldEvaluationsFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getFieldEvaluations: euidModule.getFieldEvaluationsEsql,
    /**
     * Returns the ESQL `EVAL` expressions for field evaluations (e.g. entity.namespace derivation).
     * Input: an entity definition. Output: ESQL expression string for `EVAL`, or `undefined` if none defined.
     */
    getFieldEvaluationsFromDefinition: euidModule.getFieldEvaluationsEsqlFromDefinition,
  },

  /**
   * Elasticsearch Query DSL for filters and searches (aligned with entity definitions).
   */
  dsl: {
    /** {@link euid.dsl.getEuidFilterBasedOnDocumentFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidFilterBasedOnDocument: euidModule.getEuidDslFilterBasedOnDocument,
    /**
     * Query DSL that should match documents sharing the same identity fields as the given sample document.
     * Input: an entity definition and one document; output: bool/term-style filter, or `undefined` if identity or pipeline gate fails.
     * Pass `{ excludeHigherRankedFields: false }` when looking up a stored entity by partial identity
     * (e.g. only `host.name`) — the default partition semantics would require higher-ranked fields
     * (e.g. `host.id`) to be absent and never match stored entities.
     */
    getEuidFilterBasedOnDocumentFromDefinition:
      euidModule.getEuidDslFilterBasedOnDocumentFromDefinition,

    /** {@link euid.dsl.getEuidFilterBasedOnEntityRecordFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidFilterBasedOnEntityRecord: euidModule.getEuidDslFilterBasedOnEntityRecord,
    /**
     * Query DSL that matches raw source documents belonging to an already-resolved entity-store record.
     * Trusts the record's resolved evaluated fields (e.g. `entity.namespace`) and reverse-maps them to
     * raw source-field conditions, so IdP users resolve correctly even though the record does not retain
     * `event.module` / `data_stream.dataset`. Input: an entity definition and one entity-store record; output:
     * bool/term-style filter, or `undefined` if the record lacks enough identity.
     */
    getEuidFilterBasedOnEntityRecordFromDefinition:
      euidModule.getEuidDslFilterBasedOnEntityRecordFromDefinition,

    /** {@link euid.dsl.getEuidDocumentsContainsIdFilterFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidDocumentsContainsIdFilter: euidModule.getEuidDslDocumentsContainsIdFilter,
    /**
     * Broad DSL filter: documents that may participate in the entity pipeline and could have an EUID for the definition's type.
     * Input: an entity definition only. Output: query DSL equivalent to documentsFilter (and postAgg when defined).
     */
    getEuidDocumentsContainsIdFilterFromDefinition:
      euidModule.getEuidDslDocumentsContainsIdFilterFromDefinition,
  },
  kql: {
    /** {@link euid.kql.getEuidFilterBasedOnDocumentFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
    getEuidFilterBasedOnDocument: euidModule.getEuidKqlFilterBasedOnDocument,
    /**
     * KQL that should match documents sharing the same identity fields as the given sample document.
     * Input: an entity definition and one document; output: KQL, or `undefined` if identity or pipeline gate fails.
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
