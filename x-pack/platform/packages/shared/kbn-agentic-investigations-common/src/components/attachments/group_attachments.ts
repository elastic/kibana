/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getActiveAttachments } from '@kbn/agent-builder-common/attachments';
import { toRenderAttachment } from './to_render_attachment';
import type { AttachmentGroup } from './types';
import type { KnownAttachmentGroup } from './attachment_groups';

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
 * Groups all active, non-hidden attachments by type.
 *
 * Known groups (from `knownGroups`) come first, in their declared order.
 * Ad-hoc groups (for any type not covered by a known group) follow, sorted by
 * when their earliest attachment was added, then by type id.
 *
 * Within each group, attachments are ordered by first-version time, then by id,
 * so editing an attachment never moves its row.
 */
export const groupAttachments = (
  attachments: VersionedAttachment[] | undefined,
  knownGroups: readonly KnownAttachmentGroup[]
): AttachmentGroup[] => {
  if (!attachments?.length) {
    return [];
  }

  // active flag guards logical deletion; versions.length guards hard deletion (no versions means the
  // attachment was fully removed and current_version is null — toRenderAttachment would produce
  // undefined data, so skip these too).
  const visible = getActiveAttachments(attachments).filter(
    (a) => !a.hidden && a.versions.length > 0
  );
  if (visible.length === 0) {
    return [];
  }

  const times = new Map(visible.map((a) => [a.id, getFirstVersionTime(a)]));

  const compareByFirstVersionThenId = (a: VersionedAttachment, b: VersionedAttachment): number => {
    const aTime = times.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bTime = times.get(b.id) ?? Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;
    return a.id.localeCompare(b.id);
  };

  // Build type → group id mapping from known groups
  const typeToGroupId = new Map<string, string>();
  const knownGroupTitles = new Map<string, string>();
  for (const group of knownGroups) {
    knownGroupTitles.set(group.id, group.title);
    for (const type of group.types) {
      typeToGroupId.set(type, group.id);
    }
  }

  // Bucket each attachment into its group
  const buckets = new Map<string, VersionedAttachment[]>();
  for (const attachment of visible) {
    const groupId = typeToGroupId.get(attachment.type) ?? attachment.type;
    const existing = buckets.get(groupId);
    if (existing) {
      existing.push(attachment);
    } else {
      buckets.set(groupId, [attachment]);
    }
  }

  // Sort within each bucket
  for (const bucket of buckets.values()) {
    bucket.sort(compareByFirstVersionThenId);
  }

  const knownGroupIds = new Set(knownGroups.map((g) => g.id));

  // Known groups first, in declared order
  const knownPart: AttachmentGroup[] = knownGroups
    .filter((g) => buckets.has(g.id))
    .map((g) => ({
      id: g.id,
      title: g.title,
      attachments: (buckets.get(g.id) ?? []).map(toRenderAttachment),
    }));

  // Ad-hoc groups for types not covered by any known group
  const adHocEntries = [...buckets.entries()]
    .filter(([id]) => !knownGroupIds.has(id))
    .map(([id, versionedAttachments]) => ({
      id,
      // Sort by the group's earliest attachment so the order is stable and meaningful
      earliestTime: times.get(versionedAttachments[0].id) ?? Number.POSITIVE_INFINITY,
      attachments: versionedAttachments.map(toRenderAttachment),
    }));

  adHocEntries.sort((a, b) =>
    a.earliestTime !== b.earliestTime
      ? a.earliestTime < b.earliestTime
        ? -1
        : 1
      : a.id.localeCompare(b.id)
  );

  const adHocPart: AttachmentGroup[] = adHocEntries.map(
    ({ id, attachments: groupAttachmentsList }) => ({
      id,
      attachments: groupAttachmentsList,
    })
  );

  return [...knownPart, ...adHocPart].sort((a, b) =>
    (a.title ?? a.id).localeCompare(b.title ?? b.id)
  );
};
