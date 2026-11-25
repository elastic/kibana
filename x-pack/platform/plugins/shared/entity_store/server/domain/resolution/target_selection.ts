/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NAMESPACE_PRIORITY = ['active_directory', 'okta', 'entra_id'] as const;

export interface TargetSelectionEntity {
  entityId: string;
  namespace: string;
}

/**
 * Target selection: prefer entities from identity provider namespaces
 * (in priority order), with alphabetical entity.id tiebreaker.
 */
export const selectTarget = <T extends TargetSelectionEntity>(entities: T[]): T => {
  for (const namespace of NAMESPACE_PRIORITY) {
    const candidates = entities.filter((entity) => entity.namespace === namespace);
    if (candidates.length > 0) {
      return [...candidates].sort((a, b) => a.entityId.localeCompare(b.entityId))[0];
    }
  }

  return [...entities].sort((a, b) => a.entityId.localeCompare(b.entityId))[0];
};
