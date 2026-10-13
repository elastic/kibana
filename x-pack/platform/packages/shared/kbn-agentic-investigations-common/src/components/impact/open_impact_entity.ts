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

const ENTITY_STORE_ID = /^(user|host|service):.+/;

/** Entity Store id (`user:…`, `host:…`, `service:…`). Other impact entities are names only. */
export const entityStoreIdType = (id: string): 'user' | 'host' | 'service' | undefined => {
  const match = ENTITY_STORE_ID.exec(id);
  if (!match) {
    return undefined;
  }
  return match[1] as 'user' | 'host' | 'service';
};
