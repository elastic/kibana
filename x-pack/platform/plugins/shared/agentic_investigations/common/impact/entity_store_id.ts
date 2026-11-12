/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactEntityFlyoutType } from '@kbn/agentic-investigations-common';

const ENTITY_STORE_ID = /^(user|host|service):.+/;

/**
 * Entity Store id (`user:…`, `host:…`, `service:…`). Mirrors `entityStoreIdType` in
 * `@kbn/agentic-investigations-common`, which server code cannot import: that package is
 * browser-only and its entry point loads React components.
 */
export const entityStoreIdType = (id: string): ImpactEntityFlyoutType | undefined => {
  const match = ENTITY_STORE_ID.exec(id);
  if (!match) {
    return undefined;
  }
  return match[1] as ImpactEntityFlyoutType;
};
