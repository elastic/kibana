/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityGraphTraversalEuidType,
  TraversalEntity,
} from '../../../../common/graph_traversal/hop_types';
import { ENTITY_GRAPH_TRAVERSAL_EUID_TYPES } from '../../../../common/graph_traversal/hop_types';

/** Entity document fields read to annotate a node, in the order the resolve query keeps them. */
export const TRAVERSAL_ENTITY_FIELDS = [
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'entity.source',
  'asset.criticality',
  'entity.risk.calculated_level',
  'entity.risk.calculated_score_norm',
  'entity.relationships.resolution.resolved_to',
] as const;

/** What the entity store holds for a traversed node, read off one ES|QL row. */
export interface StoredTraversalEntity {
  entity: TraversalEntity;
  /** `entity.relationships.resolution.resolved_to`: the canonical entity of an alias. */
  resolvedTo?: string;
}

/** Reads the value of an entity document field from the current row. */
export type EntityFieldReader = (field: string) => unknown;

const isEuidType = (value: string | undefined): value is EntityGraphTraversalEuidType =>
  value !== undefined && (ENTITY_GRAPH_TRAVERSAL_EUID_TYPES as readonly string[]).includes(value);

/** ES|QL multi-values arrive as arrays; take the first string, ignore anything else. */
export const firstString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : undefined;
};

const allStrings = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

/**
 * Build a node's entity annotation from the entity document fields of one row. Returns
 * undefined when the row carries no entity field at all, which is how a joined row reports
 * an id the store does not hold.
 */
export const readTraversalEntity = (read: EntityFieldReader): StoredTraversalEntity | undefined => {
  const engineType = firstString(read('entity.EngineMetadata.Type'));
  const riskScore = read('entity.risk.calculated_score_norm');
  const sources = allStrings(read('entity.source'));
  const optional = (key: keyof TraversalEntity, value: string | undefined) =>
    value !== undefined ? { [key]: value } : {};
  const entity: TraversalEntity = {
    ...optional('name', firstString(read('entity.name'))),
    ...optional('type', firstString(read('entity.type'))),
    ...optional('sub_type', firstString(read('entity.sub_type'))),
    ...(isEuidType(engineType) && { engine_type: engineType }),
    ...(sources.length > 0 && { sources }),
    ...optional('criticality', firstString(read('asset.criticality'))),
    ...optional('risk_level', firstString(read('entity.risk.calculated_level'))),
    ...(typeof riskScore === 'number' && Number.isFinite(riskScore) && { risk_score: riskScore }),
  };
  if (Object.keys(entity).length === 0) return undefined;
  const resolvedTo = firstString(read('entity.relationships.resolution.resolved_to'));
  return { entity, ...(resolvedTo !== undefined && { resolvedTo }) };
};
