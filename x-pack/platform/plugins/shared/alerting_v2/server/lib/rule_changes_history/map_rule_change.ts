/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryDocument } from '@kbn/change-history';
import type {
  RuleChangeHistoryDetail,
  RuleChangeHistoryListItem,
  RuleChangeHistorySnapshot,
} from '@kbn/alerting-v2-schemas';
import { computeChanges } from './compute_changes';

const asSnapshotRecord = (snapshot: unknown): Record<string, unknown> =>
  snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)
    : {};

/**
 * Map a change-history document (and its optional predecessor) to a lean list
 * row. Diffing is done against `previous` when provided.
 */
export function toListItem(
  document: ChangeHistoryDocument,
  previous: ChangeHistoryDocument | undefined,
  { isCurrent }: { isCurrent: boolean }
): RuleChangeHistoryListItem {
  const changes = computeChanges(
    asSnapshotRecord(document.object.snapshot),
    previous ? asSnapshotRecord(previous.object.snapshot) : undefined
  );

  const item: RuleChangeHistoryListItem = {
    id: document.event.id,
    timestamp: document['@timestamp'],
    actor: {
      name: document.user.name,
      ...(document.user.id ? { profileId: document.user.id } : {}),
    },
    action: document.event.action,
    ...(changes ? { changes } : {}),
    ...(document.event.reason ? { comment: document.event.reason } : {}),
    ...(isCurrent ? { isCurrent: true } : {}),
    ...(document.tags && document.tags.length > 0 ? { tags: document.tags } : {}),
    ...(document.object.sequence !== undefined
      ? { metadata: { version: document.object.sequence } }
      : document.metadata
      ? { metadata: document.metadata }
      : {}),
  };

  return item;
}

/**
 * Map a change-history document to a detail payload (list row + snapshot).
 */
export function toDetail(
  document: ChangeHistoryDocument,
  previous: ChangeHistoryDocument | undefined,
  options: { isCurrent: boolean }
): RuleChangeHistoryDetail {
  return {
    ...toListItem(document, previous, options),
    ...(document.event.reason ? { reason: document.event.reason } : {}),
    snapshot: asSnapshotRecord(document.object.snapshot) as RuleChangeHistorySnapshot,
  };
}
