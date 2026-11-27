/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { IncidentTimelineEntryDataSchema } from '../../../../common/types/domain/attachment/incident_timeline_entry/v2';
import type { EntryCategory, EntryRow, TimelineEntry } from './types';

export const ENTRY_CATEGORY_ORDER: readonly EntryCategory[] = [
  'actor',
  'external',
  'internal',
  'info',
  'uncategorized',
];

/** The attachment fields the entries lane reads, as the case view loads them. */
export interface EntryAttachmentLike {
  readonly id: string;
  readonly version: string;
  readonly type: string;
  readonly data?: unknown;
  readonly createdBy?: { readonly username?: string | null; readonly fullName?: string | null };
}

/** Keeps the case's timeline entries whose stored data still matches the schema. */
export const parseTimelineEntries = (
  attachments: readonly EntryAttachmentLike[]
): TimelineEntry[] =>
  attachments.flatMap((attachment) => {
    if (attachment.type !== INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE) return [];
    const parsed = IncidentTimelineEntryDataSchema.safeParse(attachment.data);
    if (!parsed.success) return [];
    const { data } = parsed;
    return [
      {
        id: attachment.id,
        version: attachment.version,
        category: data.category ?? 'uncategorized',
        occurredMs: Date.parse(data.occurredAt),
        endMs: data.endAt !== undefined ? Date.parse(data.endAt) : undefined,
        createdBy: attachment.createdBy?.fullName || attachment.createdBy?.username || '',
        data,
      },
    ];
  });

/** One row per category that has entries, in the fixed category order. */
export const buildEntryRows = (entries: readonly TimelineEntry[]): EntryRow[] =>
  ENTRY_CATEGORY_ORDER.flatMap((category) => {
    const inCategory = entries
      .filter((entry) => entry.category === category)
      .sort((a, b) => a.occurredMs - b.occurredMs);
    return inCategory.length > 0 ? [{ category, entries: inCategory }] : [];
  });
