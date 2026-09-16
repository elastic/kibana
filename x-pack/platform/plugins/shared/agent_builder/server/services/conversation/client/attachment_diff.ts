/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

export type ConversationAttachmentChangeKind = 'added' | 'updated' | 'deleted';

export interface ConversationAttachmentChange {
  kind: ConversationAttachmentChangeKind;
  attachmentId: string;
  attachmentType: string;
}

/**
 * Computes the set of attachment changes between two snapshots.
 *
 * - absent → present (active) = added
 * - present (active) → absent (permanent delete) = deleted
 * - present (active) → active: false (soft delete) = deleted
 * - present (active: false) → active (restore) = updated
 * - present → present, structurally changed = updated
 * - unchanged = nothing
 */
export const diffAttachments = ({
  before,
  after,
}: {
  before: VersionedAttachment[];
  after: VersionedAttachment[];
}): ConversationAttachmentChange[] => {
  const beforeMap = new Map(before.map((a) => [a.id, a]));
  const afterMap = new Map(after.map((a) => [a.id, a]));
  const changes: ConversationAttachmentChange[] = [];

  for (const [id, afterAttachment] of afterMap) {
    const beforeAttachment = beforeMap.get(id);
    if (!beforeAttachment) {
      // new attachment
      changes.push({ kind: 'added', attachmentId: id, attachmentType: afterAttachment.type });
    } else if (!isEqual(beforeAttachment, afterAttachment)) {
      const wasActive = beforeAttachment.active !== false;
      const isActive = afterAttachment.active !== false;
      if (wasActive && !isActive) {
        // soft-deleted
        changes.push({ kind: 'deleted', attachmentId: id, attachmentType: afterAttachment.type });
      } else {
        // restored or content update
        changes.push({ kind: 'updated', attachmentId: id, attachmentType: afterAttachment.type });
      }
    }
  }

  for (const [id, beforeAttachment] of beforeMap) {
    if (!afterMap.has(id)) {
      // permanently deleted
      changes.push({
        kind: 'deleted',
        attachmentId: id,
        attachmentType: beforeAttachment.type,
      });
    }
  }

  return changes;
};
