/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  type ImageAttachmentData,
  type SupportedImageMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { FilesStart } from '@kbn/files-plugin/public';

/**
 * Uploads an image through the Agent Builder `chat-attachment-images` file kind
 * and returns Files-backed attachment data (`file_id`, not inline bytes).
 */
export const uploadChatImage = async ({
  files,
  blob,
  name,
  mimeType,
}: {
  files: FilesStart;
  blob: Blob;
  name: string;
  mimeType: SupportedImageMimeType;
}): Promise<ImageAttachmentData> => {
  const client = files.filesClientFactory.asScoped(CHAT_ATTACHMENT_IMAGES_FILE_KIND);
  const { file } = await client.create({ name, mimeType });
  await client.upload({
    id: file.id,
    body: blob,
    contentType: mimeType,
  });
  return {
    file_id: file.id,
    name,
    mime_type: mimeType,
  };
};
