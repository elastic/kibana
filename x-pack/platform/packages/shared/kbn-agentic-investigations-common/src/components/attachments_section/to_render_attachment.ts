/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLatestVersion,
  type UnknownAttachment,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

/** Maps a stored `VersionedAttachment` to the `UnknownAttachment` shape expected by attachment UI definitions. */
export const toRenderAttachment = (attachment: VersionedAttachment): UnknownAttachment => {
  const version = getLatestVersion(attachment) ?? attachment.versions[0];
  return {
    id: attachment.id,
    type: attachment.type,
    data: version?.data,
    description: attachment.description,
    hidden: attachment.hidden,
    origin: attachment.origin,
    groupId: attachment.group_id,
    ...(version && {
      versionData: {
        version: version.version,
        versionCount: attachment.versions.length,
        createdAt: version.created_at,
        originSyncedAt: attachment.origin_snapshot_at,
      },
    }),
  };
};
