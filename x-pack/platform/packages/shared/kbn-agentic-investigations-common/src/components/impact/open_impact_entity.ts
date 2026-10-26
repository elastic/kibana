/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** An impacted entity the entity flyout can open. The flyout itself lives in the solution. */
export interface ImpactEntityTarget {
  id: string;
  name?: string;
  type?: string;
}

export type ImpactEntityFlyoutType = 'user' | 'host' | 'service';

const FLYOUT_TYPES: readonly ImpactEntityFlyoutType[] = ['user', 'host', 'service'];

const ENTITY_STORE_ID = /^(user|host|service):.+/;

const toFlyoutType = (value: string | undefined): ImpactEntityFlyoutType | undefined =>
  FLYOUT_TYPES.find((type) => type === value?.toLowerCase());

/** Entity Store id (`user:…`, `host:…`, `service:…`). Other impact entities are names only. */
export const entityStoreIdType = (id: string): ImpactEntityFlyoutType | undefined => {
  const match = ENTITY_STORE_ID.exec(id);
  if (!match) {
    return undefined;
  }
  return match[1] as ImpactEntityFlyoutType;
};

/**
 * The entity flyout an impact entity can open, from its Entity Store id or, for an entity a
 * worker recorded by name, its declared type. The flyout resolves a name through the type's
 * identity field. Absent, the entity is a label only.
 */
export const impactEntityFlyoutType = (
  entity: Pick<ImpactEntityTarget, 'id' | 'type'>
): ImpactEntityFlyoutType | undefined => entityStoreIdType(entity.id) ?? toFlyoutType(entity.type);
