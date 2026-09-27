/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../types';
import { investigationEntityIds } from './entity_ids';

export interface ImpactPill {
  entityId: string;
  /** Queue rows whose conversation carries this entity. */
  count: number;
}

/**
 * Deduped pills for the landing page. A row that lists the same id twice counts
 * once. Order is count descending, then entity id ascending.
 */
export const impactPills = (investigations: readonly Investigation[]): ImpactPill[] => {
  const counts = new Map<string, number>();
  for (const investigation of investigations) {
    for (const entityId of new Set(investigationEntityIds(investigation))) {
      counts.set(entityId, (counts.get(entityId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([entityId, count]) => ({ entityId, count }))
    .sort((left, right) => right.count - left.count || left.entityId.localeCompare(right.entityId));
};

/** Queue-row predicate for a single selected pill. */
export const matchesEntityFilter = (investigation: Investigation, entityId: string): boolean =>
  investigationEntityIds(investigation).includes(entityId);
