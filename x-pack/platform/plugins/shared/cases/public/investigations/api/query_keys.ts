/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DuplicateCheckRequest,
  FindActivityRequest,
  FindItemsRequest,
  FindRecordsRequest,
} from '../../../common/investigations/types';

const ROOT = 'investigations' as const;

/**
 * Query keys. Everything that belongs to one record shares the `recordScope` prefix, so
 * invalidating it refreshes the record, its items, activity and related records together.
 */
export const investigationKeys = {
  all: [ROOT] as const,
  findAll: () => [ROOT, 'find'] as const,
  find: (request: FindRecordsRequest) => [ROOT, 'find', request] as const,
  duplicates: (request: DuplicateCheckRequest) => [ROOT, 'duplicates', request] as const,
  types: () => [ROOT, 'types'] as const,
  procedureTemplates: () => [ROOT, 'procedure_templates'] as const,
  capabilities: () => [ROOT, 'capabilities'] as const,
  recordScope: (recordId: string) => [ROOT, 'record', recordId] as const,
  record: (recordId: string) => [ROOT, 'record', recordId, 'detail'] as const,
  items: (recordId: string, request: FindItemsRequest) =>
    [ROOT, 'record', recordId, 'items', request] as const,
  itemsAll: (recordId: string) => [ROOT, 'record', recordId, 'items'] as const,
  activity: (recordId: string, request: FindActivityRequest) =>
    [ROOT, 'record', recordId, 'activity', request] as const,
  activityAll: (recordId: string) => [ROOT, 'record', recordId, 'activity'] as const,
  related: (recordId: string) => [ROOT, 'record', recordId, 'related'] as const,
  since: (recordId: string, since: string | undefined) =>
    [ROOT, 'record', recordId, 'since', since ?? null] as const,
  /** Outside `recordScope` on purpose: the poller must not be invalidated by its own effects. */
  livePoll: (recordId: string) => [ROOT, 'live_poll', recordId] as const,
};
