/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import type { SummaryAttachmentType } from './summary_attachment_types';

/** An attachment the summary lists, paired with the display name of its kind. */
export interface SummaryAttachment {
  attachment: VersionedAttachment;
  typeName: string;
}

/**
 * When the attachment was first added. Falls back to the lowest version present rather than
 * looking version 1 up directly, because history can be pruned, and sorts unparseable or missing
 * timestamps last instead of letting NaN reach the comparator.
 */
const getFirstVersionTime = (attachment: VersionedAttachment): number => {
  const firstVersion = attachment.versions.reduce<
    VersionedAttachment['versions'][number] | undefined
  >(
    (earliest, version) => (earliest && earliest.version <= version.version ? earliest : version),
    undefined
  );

  // ISO strings can carry different UTC offsets, so compare instants rather than strings.
  const time = Date.parse(firstVersion?.created_at ?? '');

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/**
 * Picks the attachments the summary shows: the ones some kind claims, ordered by kind and then by
 * when each was first added, so editing an attachment never moves its row.
 */
export const selectSummaryAttachments = (
  attachments: VersionedAttachment[] | undefined,
  summaryAttachmentTypes: readonly SummaryAttachmentType[]
): SummaryAttachment[] => {
  if (!attachments?.length) {
    return [];
  }

  // Soft-deleted attachments stay in `conversation.attachments`, and nothing upstream drops them.
  const visible = getActiveAttachments(attachments).filter((attachment) => !attachment.hidden);

  const firstVersionTimes = new Map(
    visible.map((attachment) => [attachment.id, getFirstVersionTime(attachment)])
  );

  const byFirstVersionThenId = (a: VersionedAttachment, b: VersionedAttachment): number => {
    const aTime = firstVersionTimes.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bTime = firstVersionTimes.get(b.id) ?? Number.POSITIVE_INFINITY;

    // Compared rather than subtracted: both can be Infinity, and Infinity - Infinity is NaN.
    if (aTime !== bTime) {
      return aTime < bTime ? -1 : 1;
    }

    // The id tie-break keeps the order total: the API does not promise a stable input order.
    return a.id.localeCompare(b.id);
  };

  return summaryAttachmentTypes.flatMap(({ name, types }) =>
    visible
      .filter(({ type }) => types.includes(type))
      .sort(byFirstVersionThenId)
      .map((attachment) => ({ attachment, typeName: name }))
  );
};
