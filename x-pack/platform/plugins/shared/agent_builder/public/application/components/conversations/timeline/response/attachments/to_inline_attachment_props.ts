/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScreenContextAttachmentData,
  UnknownAttachment,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';

/**
 * Builds the `attachment` prop of `InlineAttachmentWithActions` for one version of a stored
 * attachment, or `undefined` when that version does not exist.
 */
export const toInlineAttachment = (
  attachment: VersionedAttachment,
  version: number
): UnknownAttachment | undefined => {
  const versionData = attachment.versions.find((v) => v.version === version);
  if (!versionData) {
    return undefined;
  }
  const previousVersionData = attachment.versions.find((v) => v.version === version - 1);

  return {
    id: attachment.id,
    type: attachment.type,
    data: versionData.data,
    hidden: attachment.hidden,
    origin: attachment.origin,
    versionData: {
      version,
      versionCount: attachment.versions.length,
      createdAt: versionData.created_at,
      originSyncedAt: attachment.origin_snapshot_at,
      previousVersionData: previousVersionData?.data,
    },
  };
};

/** The latest screen-context snapshot in the conversation, if one was attached. */
export const getScreenContext = (
  conversationAttachments?: VersionedAttachment[]
): ScreenContextAttachmentData | undefined => {
  const screenContextAttachment = conversationAttachments?.find(
    (att) => att.type === AttachmentType.screenContext
  );
  if (!screenContextAttachment) {
    return undefined;
  }
  const latest = getLatestVersion(screenContextAttachment);
  return latest?.data as ScreenContextAttachmentData | undefined;
};
