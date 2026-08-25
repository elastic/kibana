/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, imageAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { FilesStart } from '@kbn/files-plugin/server';

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

/**
 * Definition for the `image` attachment type. Image bytes live in the Files
 * plugin — `getBase64` is a lazy accessor invoked at LLM-delivery time, never
 * during `attachment_read`, so the base64 payload is only ever materialised
 * once per LLM turn.
 */
export const createImageAttachmentType = ({
  getFilesPlugin,
}: {
  getFilesPlugin: () => Promise<FilesStart>;
}): AttachmentTypeDefinition<AttachmentType.image, ImageAttachmentData> => {
  return {
    id: AttachmentType.image,
    isReadonly: true,
    validate: (input) => {
      const parseResult = imageAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => ({
          type: 'image' as const,
          mimeType: attachment.data.mime_type,
          getBase64: async () => {
            const filesPlugin = await getFilesPlugin();
            const fileService = filesPlugin.fileServiceFactory.asInternal();
            const file = await fileService.getById({ id: attachment.data.file_id });
            const readable = await file.downloadContent();
            const buffer = await streamToBuffer(readable);
            return buffer.toString('base64');
          },
        }),
      };
    },
    getAgentDescription: () => {
      return `An image attachment is a screenshot or other picture stored in the Files plugin.
When it was added on the current user turn, the image pixels are already included in the user message as visual input — inspect them directly. Do not capture another screenshot. Call attachment_read only if you need the image again later in the same turn.`;
    },
    getTools: () => [],
  };
};
