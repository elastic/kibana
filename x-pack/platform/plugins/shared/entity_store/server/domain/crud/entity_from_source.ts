/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { Entity, EntityType } from '../../../common';
import {
  getDocument,
  getFieldValue,
  applyWhenConditionTrueSetFields,
} from '../../../common/domain/euid/commons';
import {
  applyFieldEvaluations,
  getFieldEvaluationsFromDefinition,
} from '../../../common/domain/euid/field_evaluations';
import { getEntityDefinitionWithoutId } from '../../../common/domain/definitions/registry';
import {
  isSingleFieldIdentity,
  type EntityDefinitionWithoutId,
} from '../../../common/domain/definitions/entity_schema';
import { ENTITY_SOURCE_FIELD } from '../../../common/domain/definitions/common_fields';
import type { EntityCreatedBy } from '../../../common/domain/definitions/common_fields';
import type { EntityCreationAccepted } from '../../../common/domain/definitions/creatable_from_single_document';
import { ENTITY_TYPE_FIELD } from '../logs_extraction/query_builder_commons';

export interface BuildEntityFromSourceParams {
  entityType: EntityType;
  candidate: EntityCreationAccepted;
  /** Newest qualifying source document; its `@timestamp` seeds `entity.lifecycle.last_seen`. */
  source: unknown;
  createdBy: EntityCreatedBy;
  /** Upper bound on the entity's true first-seen; omit when unknown. */
  firstSeen?: string;
  /** Additional dot-path fields to merge onto the document (e.g. `entity.risk.calculated_score`). */
  fields?: Record<string, unknown>;
}

/** Builds an entity document from an accepted candidate using extraction semantics while leaving `@timestamp` to `validateAndTransformDoc`. */
export function buildEntityFromSource({
  entityType,
  candidate,
  source,
  createdBy,
  firstSeen,
  fields,
}: BuildEntityFromSourceParams): Entity {
  const doc = getDocument(source);
  const definition = getEntityDefinitionWithoutId(entityType);
  const built: Record<string, unknown> = {};

  set(built, 'entity.id', candidate.euid);
  for (const [field, value] of Object.entries(candidate.identityFields)) {
    set(built, field, value);
  }

  const untypedId = getUntypedId(entityType, candidate.euid, definition);
  set(built, 'entity.EngineMetadata.Type', entityType);
  set(built, 'entity.EngineMetadata.UntypedId', untypedId);
  set(built, 'entity.created_by', createdBy);
  // Match extraction's fallback so alert-only entities receive entity.type at creation.
  if (definition.entityTypeFallback) {
    set(built, ENTITY_TYPE_FIELD, definition.entityTypeFallback);
  }

  const { name, confidence } = deriveEntityNameAndConfidence(definition, doc, built);
  // Match extraction's untyped-ID fallback; validation otherwise defaults to the full EUID.
  set(built, 'entity.name', name ?? untypedId);
  if (confidence !== undefined) {
    set(built, 'entity.confidence', confidence);
  }

  const entitySource = deriveEntitySource(definition, doc);
  if (entitySource !== undefined) {
    set(built, ENTITY_SOURCE_FIELD, entitySource);
  }

  const timestamp = getFieldValue(doc, '@timestamp');
  if (timestamp !== undefined) {
    set(built, 'entity.lifecycle.last_seen', timestamp);
  }

  // `firstSeen` is lookback-bounded and may postdate the true first sighting, but leaving
  // `first_seen` unset can exclude alert-only entities from resolution; extraction preserves the
  // approximation, and `entity.created_by` keeps it targetable for correction.
  if (firstSeen !== undefined) {
    set(built, 'entity.lifecycle.first_seen', firstSeen);
  }

  if (fields) {
    for (const [field, value] of Object.entries(fields)) {
      set(built, field, value);
    }
  }

  return built as Entity;
}

function getUntypedId(
  entityType: EntityType,
  euid: string,
  definition: EntityDefinitionWithoutId
): string {
  const { identityField } = definition;
  if (isSingleFieldIdentity(identityField) && identityField.skipTypePrepend) {
    return euid;
  }
  const prefix = `${entityType}:`;
  return euid.startsWith(prefix) ? euid.slice(prefix.length) : euid;
}

function deriveEntitySource(
  definition: EntityDefinitionWithoutId,
  doc: unknown
): string[] | undefined {
  const fieldEvaluations = getFieldEvaluationsFromDefinition(definition);
  if (fieldEvaluations.length === 0) {
    return undefined;
  }
  const evaluated = applyFieldEvaluations(doc, fieldEvaluations);
  const value = evaluated[ENTITY_SOURCE_FIELD];
  return value ? [value] : undefined;
}

function deriveEntityNameAndConfidence(
  definition: EntityDefinitionWithoutId,
  doc: unknown,
  built: Record<string, unknown>
): { name?: string; confidence?: string } {
  if (definition.whenConditionTrueSetFieldsAfterStats?.length) {
    const workingDoc = merge({}, doc, built);
    applyWhenConditionTrueSetFields(workingDoc, definition.whenConditionTrueSetFieldsAfterStats);
    const name = getFieldValue(workingDoc, 'entity.name');
    const confidence = getFieldValue(workingDoc, 'entity.confidence');
    if (name !== undefined || confidence !== undefined) {
      return { name, confidence };
    }
  }

  const nameField = definition.fields.find((field) => field.destination === 'entity.name');
  const name = nameField ? getFieldValue(doc, nameField.source) : undefined;
  return { name };
}
