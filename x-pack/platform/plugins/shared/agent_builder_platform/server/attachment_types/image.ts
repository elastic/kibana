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
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return {
            type: 'image',
            mediaType: attachment.data.media_type,
            data: attachment.data.data,
          };
        },
      };
    },
    getAgentDescription: () => {
      return `An image attachment contains a screenshot or other image.
The image content is already inlined in the user message as multimodal content —
you can see it directly. Do not call attachment_read to retrieve the binary data.`;
    },
    getTools: () => [],
  };
};
