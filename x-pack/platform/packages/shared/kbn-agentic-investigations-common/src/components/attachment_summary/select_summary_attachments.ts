/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import type { SummaryAttachmentType } from './summary_attachment_types';

// Falls back to the earliest version present; sorts missing/unparseable timestamps last.
const getFirstVersionTime = (attachment: VersionedAttachment): number => {
  const firstVersion = attachment.versions.reduce<
    VersionedAttachment['versions'][number] | undefined
  >(
    (earliest, version) => (earliest && earliest.version <= version.version ? earliest : version),
    undefined
  );

  const time = Date.parse(firstVersion?.created_at ?? '');

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/**
 * Picks the attachments the summary shows: the ones some kind claims, ordered by kind rank and
 * then by when each was first added, so editing an attachment never moves its row.
 */
export const selectSummaryAttachments = (
  attachments: VersionedAttachment[] | undefined,
  summaryAttachmentTypes: readonly SummaryAttachmentType[]
): VersionedAttachment[] => {
  if (!attachments?.length) {
    return [];
  }

  const visible = getActiveAttachments(attachments).filter((attachment) => !attachment.hidden);

  const firstVersionTimes = new Map(
    visible.map((attachment) => [attachment.id, getFirstVersionTime(attachment)])
  );

  const byFirstVersionThenId = (a: VersionedAttachment, b: VersionedAttachment): number => {
    const aTime = firstVersionTimes.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bTime = firstVersionTimes.get(b.id) ?? Number.POSITIVE_INFINITY;

    if (aTime !== bTime) {
      return aTime < bTime ? -1 : 1;
    }

    return a.id.localeCompare(b.id);
  };

  return summaryAttachmentTypes.flatMap(({ types }) =>
    visible.filter(({ type }) => types.includes(type)).sort(byFirstVersionThenId)
  );
};
