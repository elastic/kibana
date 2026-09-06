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
   * using the raw observed values from the document.
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
