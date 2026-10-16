/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ImpactFilterable, investigationEntityIds } from './entity_ids';

export interface ImpactPill {
  entityId: string;
  /** Queue rows whose conversation carries this entity. */
  count: number;
  /** Entity type (`host`, `user`, …) when any row reported one for this id. */
  entityType?: string;
}

/**
 * Deduped pills for the landing page. A row that lists the same id twice counts
 * once. Order is count descending, then entity id ascending.
 */
export const impactPills = (items: readonly ImpactFilterable[]): ImpactPill[] => {
  const counts = new Map<string, number>();
  const types = new Map<string, string>();
  for (const item of items) {
    for (const entityId of new Set(investigationEntityIds(item))) {
      counts.set(entityId, (counts.get(entityId) ?? 0) + 1);
      const entityType = item.entityTypes?.[entityId];
      if (entityType && !types.has(entityId)) {
        types.set(entityId, entityType);
      }
    }
  }

  return [...counts.entries()]
    .map(([entityId, count]) => {
      const entityType = types.get(entityId);
      return { entityId, count, ...(entityType ? { entityType } : {}) };
    })
    .sort((left, right) => right.count - left.count || left.entityId.localeCompare(right.entityId));
};

/** Queue-row predicate for a single selected pill. */
export const matchesEntityFilter = (item: ImpactFilterable, entityId: string): boolean =>
  investigationEntityIds(item).includes(entityId);
