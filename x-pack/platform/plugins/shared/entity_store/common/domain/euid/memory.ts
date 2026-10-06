/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityDefinitionOfAnyType,
  EntityType,
  EuidAttribute,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import type { EuidGateOptions } from './commons';
import {
  applyWhenConditionTrueSetFields,
  documentPassesCalculatedIdentityPipelineGate,
  getDocument,
  getEffectiveEuidRanking,
  getFieldsToBeFilteredOn,
  getFieldValue,
  isEuidField,
} from './commons';
import { applyFieldEvaluations } from './field_evaluations';

/** {@link buildEvaluatedDocFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
export function buildEvaluatedDoc(entityType: EntityType, doc: any): any {
  return buildEvaluatedDocFromDefinition(getEntityDefinitionWithoutId(entityType), doc);
}

/**
 * Applies the calculated-identity evaluation pipeline of an entity definition to a document,
 * returning a fresh object — `doc` itself is never mutated. Shared by {@link getEuidFromObjectFromDefinition}
 * and {@link getEntityIdentifiersFromDocumentFromDefinition}, and by callers (e.g. the creation gate) that need
 * to evaluate a `requires` condition against fields derived at identity-evaluation time
 * (e.g. `entity.namespace`), not just raw document fields.
 *
 * For single-field identities there is nothing to evaluate, so `doc` is returned unchanged.
 */
export function buildEvaluatedDocFromDefinition(
  entityDefinition: EntityDefinitionOfAnyType,
  doc: any
): any {
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    return doc;
  }

  let evaluatedDoc = { ...doc };
  if (identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
    evaluatedDoc = { ...evaluatedDoc, ...evaluated };
  }
  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(
      evaluatedDoc,
      entityDefinition.whenConditionTrueSetFieldsPreAgg
    );
  }
  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(
      evaluatedDoc,
      entityDefinition.whenConditionTrueSetFieldsAfterStats
    );
  }
  return evaluatedDoc;
}

/** {@link getEuidFromObjectFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
export function getEuidFromObject(entityType: EntityType, doc: any, options?: EuidGateOptions) {
  return getEuidFromObjectFromDefinition(getEntityDefinitionWithoutId(entityType), doc, options);
}

/**
 * Constructs an entity id from the provided entity definition and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidFromObjectFromDefinition } from './memory';
 *
 * const euid = getEuidFromObjectFromDefinition(hostDefinition, {
 *   host: { name: 'server1', domain: 'example.com' },
 * });
 * // euid may look like:
 * // 'host:server1.example.com'
 * ```
 *
 * Applies the creation gate: a document that may not put an entity in the store yields `undefined`.
 * For entities that already exist, use {@link getEuidFromObjectForSearchFromDefinition}.
 *
 * @param entityDefinition - The entity definition whose identity rules derive the id
 * @param doc - The document to derive entity id from. May be a flattened or nested shape.
 * @param options - See {@link EuidGateOptions}.
 * @returns An entity id string, or undefined if the document does not contain enough identifying information.
 */
export function getEuidFromObjectFromDefinition(
  entityDefinition: EntityDefinitionOfAnyType,
  doc: any,
  options?: EuidGateOptions
) {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const { identityField, type: entityType } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(doc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    if (identityField.skipTypePrepend) {
      return value;
    }
    return `${entityType}:${value}`;
  }

  const evaluatedDoc = buildEvaluatedDocFromDefinition(entityDefinition, doc);

  if (!documentPassesCalculatedIdentityPipelineGate(evaluatedDoc, entityDefinition, options)) {
    return undefined;
  }

  const effectiveRanking = getEffectiveEuidRanking(evaluatedDoc, identityField);
  const composedId = getComposedFieldValues(evaluatedDoc, effectiveRanking);
  if (composedId.length === 0) {
    return undefined;
  }

  const rawId = composedId.join('');
  if (identityField.skipTypePrepend) {
    return rawId;
  }
  return `${entityType}:${rawId}`;
}

/** {@link getEuidFromObjectForSearchFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
export function getEuidFromObjectForSearch(entityType: EntityType, doc: any) {
  return getEuidFromObjectForSearchFromDefinition(getEntityDefinitionWithoutId(entityType), doc);
}

/**
 * Like {@link getEuidFromObjectFromDefinition} without the creation gate, so IdP and shared-account documents
 * still resolve to an entity that already exists.
 *
 * For risk scoring and enrichment. The caller checks store membership; this only answers which
 * entity a document refers to.
 *
 * @param entityDefinition - The entity definition whose identity rules derive the id
 * @param doc - The document to derive entity id from. May be a flattened or nested shape.
 * @returns An entity id string, or undefined if the document does not contain enough identifying information.
 */
export function getEuidFromObjectForSearchFromDefinition(
  entityDefinition: EntityDefinitionOfAnyType,
  doc: any
) {
  return getEuidFromObjectFromDefinition(entityDefinition, doc, { applyPostAggFilter: false });
}

/** {@link getEntityIdentifiersFromDocumentFromDefinition} for one of the Entity Store's built-in definitions, resolved by type name. */
export function getEntityIdentifiersFromDocument(
  entityType: EntityType,
  doc: unknown
): Record<string, string> | undefined {
  return getEntityIdentifiersFromDocumentFromDefinition(
    getEntityDefinitionWithoutId(entityType),
    doc
  );
}

/**
 * Extracts identity field name → value pairs from a document (flattened, nested, or ES hit with `_source`)
 * using the same rules as {@link getEuidFromObjectFromDefinition}. Use for entity store resolution / flyout identity seeds.
 */
export function getEntityIdentifiersFromDocumentFromDefinition(
  entityDefinition: EntityDefinitionOfAnyType,
  doc: unknown
): Record<string, string> | undefined {
  if (!doc) {
    return undefined;
  }

  const workingDoc = getDocument(doc);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(workingDoc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    return { [identityField.singleField]: value };
  }

  const evaluatedDoc = buildEvaluatedDocFromDefinition(entityDefinition, workingDoc);

  if (!documentPassesCalculatedIdentityPipelineGate(evaluatedDoc, entityDefinition)) {
    return undefined;
  }

  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(
    evaluatedDoc,
    getEffectiveEuidRanking(evaluatedDoc, identityField)
  );
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }
  return fieldsToBeFilteredOn.values;
}

function getComposedFieldValues(doc: any, euidFields: EuidAttribute[][]): string[] {
  for (const composition of euidFields) {
    const composedFieldValues = composition.map((attr) => {
      if (isEuidField(attr)) {
        return getFieldValue(doc, attr.field);
      }
      return attr.sep;
    });

    if (composedFieldValues.every((value): value is string => value !== undefined)) {
      return composedFieldValues;
    }
  }
  return [];
}
