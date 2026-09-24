/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentsService } from '../../../../services';
import type { AttachmentItem, GroupedItem, TimelineItem, UnresolvedAttachmentItem } from './types';

interface ResolveTimelineItemsDeps {
  /** The conversation's stored attachments, if loaded. */
  attachments?: VersionedAttachment[];
  attachmentsService: Pick<AttachmentsService, 'hasAttachmentType'>;
}

const resolveAttachmentItem = (
  item: UnresolvedAttachmentItem,
  attachmentsById: Map<string, VersionedAttachment>,
  attachmentsService: Pick<AttachmentsService, 'hasAttachmentType'>
): AttachmentItem | undefined => {
  const { attachment_id: attachmentId, current_version: version } = item.event.data;
  const attachment = attachmentsById.get(attachmentId);
  if (!attachment || attachment.hidden || attachment.active === false) {
    return undefined;
  }
  if (!attachmentsService.hasAttachmentType(attachment.type)) {
    return undefined;
  }
  if (!attachment.versions.some((candidate) => candidate.version === version)) {
    return undefined;
  }
  return { ...item, attachment, version };
};

/**
 * Turns grouped items into items that can draw, dropping the rest. An item that would render
 * nothing must never reach `Timeline`: it would still get a date divider, a gutter and a slot in
 * the scroll anchor.
 */
export const resolveTimelineItems = (
  items: GroupedItem[],
  { attachments, attachmentsService }: ResolveTimelineItemsDeps
): TimelineItem[] => {
  const attachmentsById = new Map(
    (attachments ?? []).map((attachment) => [attachment.id, attachment])
  );
  const resolved: TimelineItem[] = [];
  for (const item of items) {
    if (item.kind !== 'attachment') {
      resolved.push(item);
      continue;
    }
    const attachmentItem = resolveAttachmentItem(item, attachmentsById, attachmentsService);
    if (attachmentItem) {
      resolved.push(attachmentItem);
    }
  }
  return resolved;
};
