/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeys } from '../store/api_keys';

/** One key to invalidate, in the shape of a pending-invalidation saved object. */
export interface InvalidationTarget {
  apiKeyId: string;
  /** The raw `essu_` secret of a UIAM key, which its invalidation authenticates with. */
  uiamApiKey?: string;
  taskId?: string;
  taskStartedAt?: string;
}

/**
 * Returns the keys Kibana owns and should invalidate. User-created keys are never invalidated,
 * and keys without an id can't be targeted.
 */
export const getInvalidationTargets = (keys: ApiKeys | undefined): InvalidationTarget[] => {
  if (!keys || keys.createdByUser) {
    return [];
  }

  const targets: InvalidationTarget[] = [];
  if (keys.es?.id) {
    targets.push({ apiKeyId: keys.es.id });
  }
  if (keys.uiam?.id) {
    targets.push({ apiKeyId: keys.uiam.id, uiamApiKey: keys.uiam.secret });
  }
  return targets;
};
