/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalSyncConflictStrategy,
  ExternalSyncDirection,
  ExternalSyncField,
  ExternalSyncFieldRule,
  ExternalSyncFieldRules,
} from '../types/domain';

export const EXTERNAL_SYNC_FIELDS: readonly ExternalSyncField[] = [
  'title',
  'description',
  'status',
  'tags',
  'comments',
];

// Status is only read back from the incident (pushing it needs the connector's status
// transitions), so the other directions would be dead settings for it.
export const EXTERNAL_SYNC_FIELD_DIRECTIONS: Record<
  ExternalSyncField,
  readonly ExternalSyncDirection[]
> = {
  title: ['both', 'push', 'pull', 'off'],
  description: ['both', 'push', 'pull', 'off'],
  status: ['pull', 'off'],
  tags: ['both', 'push', 'pull', 'off'],
  comments: ['both', 'push', 'pull', 'off'],
};

export const DEFAULT_EXTERNAL_SYNC_FIELD_RULES: Record<ExternalSyncField, ExternalSyncFieldRule> = {
  title: { field: 'title', direction: 'both' },
  description: { field: 'description', direction: 'both' },
  status: { field: 'status', direction: 'pull' },
  tags: { field: 'tags', direction: 'push' },
  comments: { field: 'comments', direction: 'push' },
};

export interface ResolvedExternalSyncFieldRule {
  direction: ExternalSyncDirection;
  conflictStrategy?: ExternalSyncConflictStrategy;
}

export type ResolvedExternalSyncFieldRules = Record<
  ExternalSyncField,
  ResolvedExternalSyncFieldRule
>;

/**
 * Fills the saved rules with the defaults so callers can index every field.
 * A saved direction the field does not support falls back to the default.
 */
export const resolveExternalSyncFieldRules = (
  rules?: ExternalSyncFieldRules | null
): ResolvedExternalSyncFieldRules => {
  const resolved = {} as ResolvedExternalSyncFieldRules;

  for (const field of EXTERNAL_SYNC_FIELDS) {
    const saved = rules?.find((rule) => rule.field === field);
    const direction =
      saved != null && EXTERNAL_SYNC_FIELD_DIRECTIONS[field].includes(saved.direction)
        ? saved.direction
        : DEFAULT_EXTERNAL_SYNC_FIELD_RULES[field].direction;

    resolved[field] = {
      direction,
      ...(saved?.conflictStrategy != null ? { conflictStrategy: saved.conflictStrategy } : {}),
    };
  }

  return resolved;
};

export const pullsFromExternal = (direction: ExternalSyncDirection): boolean =>
  direction === 'pull' || direction === 'both';

export const pushesToExternal = (direction: ExternalSyncDirection): boolean =>
  direction === 'push' || direction === 'both';
