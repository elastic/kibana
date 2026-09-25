/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const userProfileQueryKeys = {
  all: ['agenticInvestigations', 'userProfiles'] as const,
  current: () => [...userProfileQueryKeys.all, 'current'] as const,
  /**
   * `size` is part of the key so callers with different page sizes (queue uses 20,
   * modal uses 10) don't share a truncated cache entry.
   */
  suggest: (term: string, size: number) =>
    [...userProfileQueryKeys.all, 'suggest', term, size] as const,
  bulk: (uids: readonly string[]) => [...userProfileQueryKeys.all, 'bulk', uids] as const,
};
