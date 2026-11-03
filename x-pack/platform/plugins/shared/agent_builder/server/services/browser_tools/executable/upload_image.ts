/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { FilesStart } from '@kbn/files-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common';
import {
  ATTACHMENT_REF_ACTOR,
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  SUPPORTED_IMAGE_MIME_TYPES,
} from '@kbn/agent-builder-common/attachments';
import type { BrowserToolsRunContext } from '@kbn/agent-builder-server/runner';
import { getToolResultId } from '@kbn/agent-builder-server';

const extensionFor = (mimeType: string) => (mimeType === 'image/jpeg' ? 'jpg' : 'png');

const DATA_URL_PREFIX = /^data:[^;,]*;base64,/;

const decodeImage = (base64: string): Buffer => {
  const buffer = Buffer.from(base64.replace(DATA_URL_PREFIX, ''), 'base64');
  if (buffer.length === 0) {
    throw new Error('Image is empty');
  }
  return buffer;
};

/**
 * Stores an image returned by a browser tool as a chat image file, adds it as an image
 * attachment, and returns the image marker referencing that attachment.
 */
export const createUploadBrowserToolImage = ({
  files,
}: {
  files: FilesStart;
}): BrowserToolsRunContext['uploadImage'] => {
  return async ({ image, request, attachments, toolId }) => {
    const { mime_type: mimeType } = image;
    if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new Error(`Unsupported image mime type: ${mimeType}`);
    }
    const content = decodeImage(image.base64);
    const name = image.name ?? `${toolId}_screenshot.${extensionFor(mimeType)}`;

    const file = await files.fileServiceFactory.asScoped(request).create({
      fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      name,
      mime: mimeType,
    });

    let attachmentId: string;
    try {
      await file.uploadContent(Readable.from(content));
      const attachment = await attachments.add(
        {
          type: AttachmentType.image,
          data: { file_id: file.id, name, mime_type: mimeType },
          description: image.description,
        },
        ATTACHMENT_REF_ACTOR.agent,
        undefined,
        { request }
      );
      attachmentId = attachment.id;
    } catch (error) {
      await file.delete().catch(() => {});
      throw error;
    }

    return {
      tool_result_id: getToolResultId(),
      type: ToolResultType.image,
      data: {
        attachment_id: attachmentId,
        mime_type: mimeType,
        name,
        description: `Screenshot taken by ${toolId}.`,
      },
    };
  };
};
