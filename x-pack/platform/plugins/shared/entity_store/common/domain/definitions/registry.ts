/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import type { EntityType, ExtractionMode } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { hostEntityDefinition } from './host';
import { userEntityDefinition } from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';

/**
 * Extraction variants of one entity type. `single` is the definition every consumer outside log
 * extraction resolves to. `priority` and `nonPriority` are registered as a pair: a priority gate
 * without its complement would leave the documents that gate rejects unscanned.
 */
type EntityDefinitionVariants =
  | { single: EntityDefinitionWithoutId; priority?: undefined; nonPriority?: undefined }
  | {
      single: EntityDefinitionWithoutId;
      priority: EntityDefinitionWithoutId;
      nonPriority: EntityDefinitionWithoutId;
    };

const entitiesDefinitionRegistry = {
  host: { single: hostEntityDefinition },
  user: { single: userEntityDefinition },
  service: { single: serviceEntityDefinition },
  generic: { single: genericEntityDefinition },
} as const satisfies Record<EntityType, EntityDefinitionVariants>;

const getEntityDefinitionVariants = (type: EntityType): EntityDefinitionVariants => {
  const variants = entitiesDefinitionRegistry[type];
  assert(variants, `No entity description found for type: ${type}`);

  return variants;
};

/** Dual-process capability is derived from the registry, so it cannot be declared without being implemented. */
export const hasPriorityVariant = (type: EntityType): boolean =>
  getEntityDefinitionVariants(type).priority !== undefined;

/** 'nonPriority' is excluded: the non-priority task hardcodes its own identity directly. */
export const resolveExtractionMode = (
  isDualProcessEnabled: boolean,
  entityType: EntityType
): Extract<ExtractionMode, 'priority' | 'single'> => {
  if (isDualProcessEnabled && hasPriorityVariant(entityType)) return 'priority';
  return 'single';
};

export const getEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export function getEntityDefinition(
  type: EntityType,
  namespace: string,
  extractionMode: ExtractionMode = 'single'
): ManagedEntityDefinition {
  const definition = getEntityDefinitionWithoutId(type, extractionMode);

  return {
    ...definition,
    id: getEntityDefinitionId(type, namespace),
    type,
  };
}

/**
 * Resolves an entity definition. The default `'single'` mode returns the definition used by every
 * consumer outside log extraction.
 */
export function getEntityDefinitionWithoutId(
  type: EntityType,
  extractionMode: ExtractionMode = 'single'
): EntityDefinitionWithoutId {
  const definition = getEntityDefinitionVariants(type)[extractionMode];
  assert(
    definition,
    `No '${extractionMode}' extraction variant registered for entity type: ${type}`
  );

  return definition;
}
