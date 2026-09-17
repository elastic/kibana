/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isEuidField, getSourceFieldNames } from './commons';

export interface IdentitySourceFields {
  /** Fields that participate in identity (EUID composition). Derived from euidRanking.
   * At least one is typically required for a valid identity; the exact rule is in documentsFilter.
   */
  requiresOneOf: string[];
  /** All field names used in EUID composition, deduplicated.
   * This can be used to extract the ID fields from the document.
   */
  identitySourceFields: string[];
}

export interface NamespaceSourceFields {
  /**
   * Source fields matched with an exact term query (e.g. `event.module`).
   * These are declared as `{ field: '...' }` in `fieldEvaluations[].sources`.
   */
  exactMatchFields: string[];
  /**
   * Source fields matched with a prefix query because the entity store takes only the first chunk
   * before a delimiter (e.g. `data_stream.dataset` split on `.` gives `gcp` from `gcp.audit`).
   * Declared as `{ firstChunkOfField: '...', splitBy: '.' }` in `fieldEvaluations[].sources`.
   * When building Kibana filters, replace prefix clauses on these fields with exact phrase filters
   * using the raw observed values from the document — see {@link getEuidNamespaceSourcePrefix}.
   */
  prefixMatchFields: string[];
}

/**
 * Returns the identity source field names for a given entity type.
 * Field evaluation destinations (e.g. entity.namespace) are excluded, since they are computed and not stored.
 *
 * @param entityType - The entity type (e.g. 'host', 'user', 'service')
 * @returns requiresOneOf (same as identitySourceFields) and identitySourceFields from euidRanking
 */
export function getEuidSourceFields(entityType: EntityType): IdentitySourceFields {
  const { identityField } = getEntityDefinitionWithoutId(entityType);

  if (isSingleFieldIdentity(identityField)) {
    const field = identityField.singleField;
    return {
      requiresOneOf: [field],
      identitySourceFields: [field],
    };
  }

  const { euidRanking, fieldEvaluations } = identityField;
  const evaluationDestinations = new Set((fieldEvaluations ?? []).map((e) => e.destination));
  const allFields = Array.from(
    new Set(
      euidRanking.branches.flatMap((branch) =>
        branch.ranking.flatMap((composition) =>
          composition.filter(isEuidField).map((attr) => attr.field)
        )
      )
    )
  );
  const identitySourceFields = allFields.filter((field) => !evaluationDestinations.has(field));
  return {
    requiresOneOf: identitySourceFields,
    identitySourceFields,
  };
}

/**
 * Returns the namespace source fields for a given entity type, split by how they are matched.
 *
 * The entity store derives `entity.namespace` from a `fieldEvaluations` entry whose `sources`
 * list may contain plain fields (`{ field }`, matched with a term query) and prefix-chunked fields
 * (`{ firstChunkOfField, splitBy }`, matched with a prefix query). This distinction matters when
 * translating EUID DSL into Kibana filter operators: Kibana has no "starts with" operator, so
 * callers should replace prefix clauses on `prefixMatchFields` with exact phrase filters built from
 * the raw observed field values (e.g. `data_stream.dataset: "gcp.audit"` instead of a prefix on
 * `"gcp"`).
 *
 * Only the `sources` array of each field evaluation is considered — condition-based branches
 * (`whenClauses` with `condition:`) are not included because they never produce prefix clauses
 * in the DSL.
 *
 * @param entityType - The entity type (e.g. 'host', 'user', 'service', 'generic')
 * @returns exactMatchFields and prefixMatchFields from the entity's fieldEvaluations sources
 */
export function getEuidNamespaceSourceFields(entityType: EntityType): NamespaceSourceFields {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  if (isSingleFieldIdentity(identityField)) {
    return { exactMatchFields: [], prefixMatchFields: [] };
  }
  const allSources = (identityField.fieldEvaluations ?? []).flatMap((fe) => fe.sources);
  return getSourceFieldNames(allSources);
}

/**
 * Reduces a raw observed field value to the prefix a prefix-matched namespace source would derive
 * from it, or `undefined` when the field is not such a source for this entity type.
 *
 * A `firstChunkOfField` source keeps only the part before its delimiter, so
 * `data_stream.dataset: "okta.system"` derives the namespace prefix `okta`. The DSL builder reverses
 * that into a prefix query (`data_stream.dataset: okta*`), and callers replacing such a clause with
 * an exact phrase filter need to know which arm an observed value belongs to — an entity type can
 * emit several arms for one field (the `user` definition accepts both `okta` and
 * `entityanalytics_okta`).
 *
 * Comparing this result to an arm's prefix is **not** the same as testing `value.startsWith(prefix)`:
 * `okta_legacy.system` reduces to `okta_legacy`, so it does not belong to the `okta` arm even though
 * its string starts with it. Use this rather than reimplementing the split, since only the entity
 * definition knows each source's `splitBy` delimiter.
 *
 * @param entityType - The entity type whose definition declares the source
 * @param field - The candidate namespace source field (e.g. `data_stream.dataset`)
 * @param observedValue - The raw value the document carried (e.g. `okta.system`)
 * @returns the derived prefix (e.g. `okta`), or `undefined` if `field` is not a prefix-matched
 *   source for this entity type
 */
export function getEuidNamespaceSourcePrefix(
  entityType: EntityType,
  field: string,
  observedValue: string
): string | undefined {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  if (isSingleFieldIdentity(identityField)) {
    return undefined;
  }

  for (const evaluation of identityField.fieldEvaluations ?? []) {
    for (const source of evaluation.sources) {
      if ('firstChunkOfField' in source && source.firstChunkOfField === field) {
        return observedValue.split(source.splitBy)[0];
      }
    }
  }

  return undefined;
}
