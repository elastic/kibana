/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactPill } from '@kbn/agentic-investigations-common';

/** The slice of an impact entity a pill is built from. */
export interface ImpactPillEntity {
  id: string;
  type?: string;
  name?: string;
}

/**
 * One pill per entity, counting the rows that touch it: each conversation adds its weight (the
 * rows it holds) once per entity, however many times its impact lists the entity. Largest first,
 * ties by id. The first type and name reported for an id label its pill.
 */
export const buildImpactPills = (
  weightByConversation: ReadonlyMap<string, number>,
  entitiesByConversation: ReadonlyMap<string, ReadonlyArray<ImpactPillEntity>>
): ImpactPill[] => {
  const counts = new Map<string, number>();
  const types = new Map<string, string>();
  const names = new Map<string, string>();
  for (const [conversationId, entities] of entitiesByConversation) {
    const weight = weightByConversation.get(conversationId) ?? 0;
    if (weight === 0) continue;
    const seen = new Set<string>();
    for (const { id, type, name } of entities) {
      if (type && !types.has(id)) types.set(id, type);
      if (name && !names.has(id)) names.set(id, name);
      if (seen.has(id)) continue;
      seen.add(id);
      counts.set(id, (counts.get(id) ?? 0) + weight);
    }
  }
  return [...counts]
    .map(([entityId, count]) => {
      const entityType = types.get(entityId);
      const name = names.get(entityId);
      return {
        entityId,
        count,
        ...(entityType ? { entityType } : {}),
        ...(name ? { name } : {}),
      };
    })
    .sort((a, b) => b.count - a.count || a.entityId.localeCompare(b.entityId));
};
