/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  MAX_IMAGE_BYTES,
  type ImageAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

export const DASHBOARD_PRETTIFY_IMAGE_NAME = 'dashboard-prettify.png';

export const uploadChatImage = async ({
  filesClient,
  blob,
}: {
  filesClient: Pick<ScopedFilesClient, 'create' | 'upload' | 'delete'>;
  blob: Blob;
}): Promise<ImageAttachmentData> => {
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Dashboard screenshot is ${blob.size} bytes; images must be at most ${MAX_IMAGE_BYTES} bytes`
    );
  }

  const { file } = await filesClient.create({
    name: DASHBOARD_PRETTIFY_IMAGE_NAME,
    mimeType: 'image/png',
  });

  try {
    await filesClient.upload({
      id: file.id,
      body: blob,
      contentType: 'image/png',
    });
  } catch (error) {
    await filesClient.delete({ id: file.id }).catch(() => undefined);
    throw error;
  }

  return {
    file_id: file.id,
    name: DASHBOARD_PRETTIFY_IMAGE_NAME,
    mime_type: 'image/png',
  };
};

export const createChatImageFilesClient = (filesClientFactory: {
  asScoped: (fileKind: string) => ScopedFilesClient;
}): ScopedFilesClient => filesClientFactory.asScoped(CHAT_ATTACHMENT_IMAGES_FILE_KIND);
