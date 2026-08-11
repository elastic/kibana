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
 * Creates the definition for the `image` attachment type.
 *
 * `getFilesPlugin` is a lazy accessor so the Files plugin is resolved after start().
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
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => ({
          type: 'image' as const,
          mimeType: attachment.data.mime_type,
          // POC: bytes are fetched lazily from the files plugin here.
          // The tool-result path (attachment_read) must never call getBase64() —
          // only the prompt builder (formatActions) does, and only once per LLM call.
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
      return 'An image attachment. Call attachment_read(attachment_id) — the image will be shown to you directly as visual input in the message following the tool result.';
    },
    getTools: () => [],
  };
};
