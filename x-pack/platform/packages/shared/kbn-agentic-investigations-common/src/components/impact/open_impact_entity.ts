/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security registers this at start. The shared Impact section cannot import the entity flyout.
 */
export interface ImpactEntityTarget {
  id: string;
  name?: string;
  type?: string;
}

const ENTITY_STORE_ID = /^(user|host|service):.+/;

/** Entity Store id (`user:…`, `host:…`, `service:…`). Other impact entities are names only. */
export const entityStoreIdType = (id: string): 'user' | 'host' | 'service' | undefined => {
  const match = ENTITY_STORE_ID.exec(id);
  if (!match) {
    return undefined;
  }
  return match[1] as 'user' | 'host' | 'service';
};

type ImpactEntityOpener = (entity: ImpactEntityTarget) => void;

let opener: ImpactEntityOpener | undefined;

/** Replaces the opener. Called once from the solution that owns the entity flyout. */
export const registerImpactEntityOpener = (next: ImpactEntityOpener): void => {
  opener = next;
};

export const hasImpactEntityOpener = (): boolean => opener !== undefined;

/** Drops the opener. Tests use this so a registration does not leak into later cases. */
export const clearImpactEntityOpener = (): void => {
  opener = undefined;
};

/** Opens the entity flyout when a solution registered an opener. */
export const openImpactEntity = (entity: ImpactEntityTarget): boolean => {
  if (!opener) {
    return false;
  }
  opener(entity);
  return true;
};
