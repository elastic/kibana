/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';

/**
 * Merges `nextAttachments` into `existingAttachments` (upsert by id).
 *
 * - Existing items with a matching `id` in `nextAttachments` are replaced (updated in place).
 * - Items in `nextAttachments` whose `id` is not in the existing list are appended.
 * - Items without an `id` are always appended.
 *
 * Order: existing list (with updates applied), then new items. Does not mutate inputs.
 */
export const upsertAttachmentsIntoList = (
  existingAttachments: AttachmentInput[] | undefined,
  nextAttachments: AttachmentInput[]
): AttachmentInput[] => {
  const existing = [...(existingAttachments ?? [])];

  // Map of id -> attachment for the incoming list (only items with id). Used to update
  // existing entries in O(1). keyBy keeps last occurrence when ids repeat, which we want.
  const nextById = keyBy(
    nextAttachments.filter((a): a is AttachmentInput & { id: string } => Boolean(a.id)),
    'id'
  );

  // Ids already present in existing list — used to decide which next items are truly "new"
  // and should be appended (we must not re-append when we only meant to update by id).
  const existingIds = new Set(existing.map((a) => a.id).filter((id): id is string => Boolean(id)));

  // Preserve existing order: each slot keeps its item or the updated version from nextById.
  const updated = existing.map((a) => (a.id && nextById[a.id] ? nextById[a.id] : a));

  // Append only items that are new (no id) or whose id was not in the existing list.
  const newItems = nextAttachments.filter((a) => !a.id || !existingIds.has(a.id));

  return [...updated, ...newItems];
};
