/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactEntity } from './impact';

const definedEntity = (entity: ImpactEntity): ImpactEntity => {
  const stored: ImpactEntity = { id: entity.id };
  if (entity.name !== undefined) stored.name = entity.name;
  if (entity.type !== undefined) stored.type = entity.type;
  if (entity.featureId !== undefined) stored.featureId = entity.featureId;
  if (entity.streamName !== undefined) stored.streamName = entity.streamName;
  if (entity.evidence !== undefined) stored.evidence = entity.evidence;
  return stored;
};

/**
 * Dedupes entities by id. First write wins the id. A later write fills or replaces only the
 * fields it actually sends. Shared by the server (attach/set) and the escalation overview, which
 * merges the impact of every linked investigation into one list.
 */
export const unionEntities = (entities: ImpactEntity[]): ImpactEntity[] => {
  const byId = new Map<string, ImpactEntity>();
  for (const entity of entities) {
    const current = byId.get(entity.id);
    if (!current) {
      byId.set(entity.id, definedEntity(entity));
      continue;
    }
    byId.set(
      entity.id,
      definedEntity({
        id: current.id,
        name: entity.name ?? current.name,
        type: entity.type ?? current.type,
        featureId: entity.featureId ?? current.featureId,
        streamName: entity.streamName ?? current.streamName,
        evidence: entity.evidence ?? current.evidence,
      })
    );
  }
  return [...byId.values()];
};
