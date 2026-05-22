/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';

/**
 * Merges `nextAttachments` into `existingAttachments` (upsert by id).
 *
 * - Existing items with a matching `id` are replaced (updated in place).
 *   AttachmentGroup always has an `id`; AttachmentInput.id is optional.
 * - Items whose `id` is not in the existing list are appended.
 * - Items without an `id` are always appended.
 *
 * Order: existing list (with updates applied), then new items. Does not mutate inputs.
 */
export const upsertAttachmentsIntoList = (
  existingAttachments: ConversationAttachment[] | undefined,
  nextAttachments: ConversationAttachment[]
): ConversationAttachment[] => {
  const existing = [...(existingAttachments ?? [])];

  const nextById = keyBy(
    nextAttachments.filter((a): a is ConversationAttachment & { id: string } => Boolean(a.id)),
    'id'
  );

  const existingIds = new Set(existing.map((a) => a.id).filter((id): id is string => Boolean(id)));

  const updated = existing.map((a) => (a.id && nextById[a.id] ? nextById[a.id] : a));
  const newItems = nextAttachments.filter((a) => !a.id || !existingIds.has(a.id));

  return [...updated, ...newItems];
};
