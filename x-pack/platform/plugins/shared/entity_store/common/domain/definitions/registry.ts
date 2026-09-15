/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import type { EntityType, ExtractionMode } from './entity_schema';
import { EXTRACTION_MODE } from './entity_schema';
import { type EntityDefinitionWithoutId, type ManagedEntityDefinition } from './entity_schema';
import { hostEntityDefinition } from './host';
import {
  userEntityDefinition,
  userNonPriorityEntityDefinition,
  userPriorityEntityDefinition,
} from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';

/** The definition every consumer outside log extraction resolves to. */
interface EntityDefinitionBase {
  single: EntityDefinitionWithoutId;
}

/**
 * A type without dual-process support. `never` keeps the process variants out entirely rather than
 * making them optional, so a half-registered pair cannot typecheck, while still leaving the keys
 * readable across the union.
 */
interface SingleProcessDefinition extends EntityDefinitionBase {
  priority?: never;
  nonPriority?: never;
}

/**
 * A type with dual-process support. The two process variants exist only as a pair: a priority gate
 * without its complement would leave the documents that gate rejects unscanned.
 */
interface DualProcessDefinitions extends EntityDefinitionBase {
  priority: EntityDefinitionWithoutId;
  nonPriority: EntityDefinitionWithoutId;
}

/** Either single only, or single plus both process variants. */
type EntityDefinitionVariants = SingleProcessDefinition | DualProcessDefinitions;

const entitiesDefinitionRegistry = {
  host: { single: hostEntityDefinition },
  user: {
    single: userEntityDefinition,
    priority: userPriorityEntityDefinition,
    nonPriority: userNonPriorityEntityDefinition,
  },
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

/**
 * 'nonPriority' is excluded: the non-priority task hardcodes its own identity directly.
 *
 * Enabling the flag for a type sends it down the priority variant, which scans only the documents
 * its gate admits. The complement is reached solely by the non-priority task, so the flag is safe
 * to enable only once that task is scheduled for the type; a registered priority variant on its own
 * is not enough.
 */
export const resolveExtractionMode = (
  isDualProcessEnabled: boolean,
  entityType: EntityType
): Extract<ExtractionMode, 'priority' | 'single'> => {
  if (isDualProcessEnabled && hasPriorityVariant(entityType)) return EXTRACTION_MODE.priority;
  return EXTRACTION_MODE.single;
};

export const getEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export function getEntityDefinition(
  type: EntityType,
  namespace: string,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
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
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): EntityDefinitionWithoutId {
  const definition = getEntityDefinitionVariants(type)[extractionMode];
  assert(
    definition,
    `No '${extractionMode}' extraction variant registered for entity type: ${type}`
  );

  return definition;
}
