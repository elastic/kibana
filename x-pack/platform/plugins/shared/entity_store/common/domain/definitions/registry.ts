/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';

import { EXTRACTION_MODE, type EntityType, type ExtractionMode } from './entity_schema';
import {
  type EntityDefinitionWithoutId,
  type GatedEntityDefinition,
  type ManagedEntityDefinition,
} from './entity_schema';
import { resolveExtractionGate } from './extraction_gate';
import { hostEntityDefinition } from './host';
import { userEntityDefinition } from './user';
import { serviceEntityDefinition } from './service';
import { genericEntityDefinition } from './generic';

/** One definition per entity type; the extraction processes are modes of it, not copies of it. */
const entitiesDefinitionRegistry = {
  host: hostEntityDefinition,
  user: userEntityDefinition,
  service: serviceEntityDefinition,
  generic: genericEntityDefinition,
} as const satisfies Record<EntityType, EntityDefinitionWithoutId>;

const getRegisteredDefinition = (type: EntityType): EntityDefinitionWithoutId => {
  const definition = entitiesDefinitionRegistry[type];
  assert(definition, `No entity description found for type: ${type}`);

  return definition;
};

/**
 * Dual-process capability is derived from the definition, so it cannot be declared without being
 * implemented. A declared gate yields both processes at once, since the non-priority process scans
 * the complement the same gate defines.
 */
export const hasPriorityExtractionGate = (type: EntityType): boolean =>
  getRegisteredDefinition(type).priorityExtractionGate !== undefined;

/**
 * Whether this type's non-priority process applies sampling. Requires the priority gate, since
 * sampling only exists where a non-priority process does.
 */
export const supportsNonPrioritySampling = (type: EntityType): boolean =>
  hasPriorityExtractionGate(type) && getRegisteredDefinition(type).nonPrioritySampling === true;

/**
 * 'nonPriority' is excluded: the non-priority task hardcodes its own mode directly.
 *
 * Enabling the flag for a type sends it down the priority mode, which scans only the documents its
 * gate admits. The complement is reached solely by the non-priority task, so the flag is safe to
 * enable only once that task is scheduled for the type; a declared gate on its own is not enough.
 */
export const resolveExtractionMode = (
  isDualProcessEnabled: boolean,
  entityType: EntityType
): Extract<ExtractionMode, 'priority' | 'single'> => {
  if (isDualProcessEnabled && hasPriorityExtractionGate(entityType))
    return EXTRACTION_MODE.priority;
  return EXTRACTION_MODE.single;
};

export const getEntityDefinitionId = (entityType: EntityType, space: string) =>
  `security_${entityType}_${space}`;

export function getEntityDefinition(
  type: EntityType,
  namespace: string,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): GatedEntityDefinition<ManagedEntityDefinition> {
  const definition = getEntityDefinitionWithoutId(type, extractionMode);

  return {
    ...definition,
    id: getEntityDefinitionId(type, namespace),
    type,
  };
}

/**
 * Resolves an entity definition for an extraction mode. The default `'single'` mode returns the
 * registered definition untouched, which is what every consumer outside log extraction reads.
 *
 * The process modes return it with `extractionGate` resolved from `priorityExtractionGate`. Both
 * gates come from that one declaration, so they cannot drift out of being complements.
 */
export function getEntityDefinitionWithoutId(
  type: EntityType,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): GatedEntityDefinition<EntityDefinitionWithoutId> {
  const definition = getRegisteredDefinition(type);
  assert(
    extractionMode === EXTRACTION_MODE.single || definition.priorityExtractionGate,
    `No priority extraction gate declared for entity type: ${type}, cannot resolve '${extractionMode}' mode`
  );

  const extractionGate = resolveExtractionGate(definition.priorityExtractionGate, extractionMode);
  if (!extractionGate) return definition;

  return { ...definition, extractionGate };
}
