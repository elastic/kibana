/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';

/**
 * Projects a conversation attachment into the flat shape attachment UI definitions render from.
 *
 * Always returns an attachment. `current_version` can point at a version that is no longer
 * stored, so the lowest one still present stands in; with no versions at all the attachment keeps
 * its identity and carries no data, which every `getLabel` already tolerates.
 */
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
