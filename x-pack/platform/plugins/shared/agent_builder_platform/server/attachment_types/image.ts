/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, imageAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Creates the definition for the `image` attachment type.
 */
export const createImageAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.image,
  ImageAttachmentData
> => {
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
        // getRepresentation is used here (despite being @deprecated) because the image content
        // must not appear in the system prompt — the placeholder prevents base64 leaking into
        // the text channel; there is no other override mechanism today.
        getRepresentation: () => {
          const { mime_type: mimeType, filename } = attachment.data;
          const label = filename ? `"${filename}" (${mimeType})` : `(${mimeType})`;
          return {
            type: 'text' as const,
            value: `[Image attachment ${label} — provided directly to the model as visual input]`,
          };
        },
      };
    },
    getAgentDescription: () => {
      return 'An image attachment contains an image provided directly to the model as visual input.';
    },
    getTools: () => [],
  };
};
