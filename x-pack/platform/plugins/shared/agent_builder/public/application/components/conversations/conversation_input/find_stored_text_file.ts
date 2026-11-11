/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  getContentKey,
  getLatestVersion,
  type TextAttachmentData,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

/**
 * The id of the conversation attachment that already holds this text file.
 * The server skips such a file on Send, so the chip links to the stored one instead.
 */
export const findStoredTextFileId = (
  textFile: TextAttachmentData,
  conversationAttachments: readonly VersionedAttachment[] = []
): string | undefined => {
  const textFileKey = getContentKey({ type: AttachmentType.text, data: textFile }, '');
  return conversationAttachments.find((attachment) => {
    const latestVersion = getLatestVersion(attachment);
    return (
      latestVersion !== undefined &&
      `${attachment.type}:${latestVersion.content_hash}` === textFileKey
    );
  })?.id;
};
