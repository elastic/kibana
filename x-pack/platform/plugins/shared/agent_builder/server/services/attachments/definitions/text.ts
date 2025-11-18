/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, textAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Creates the definition for the `text` attachment type.
 */
export const createTextAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.text,
  TextAttachmentData
> => {
  return {
    id: AttachmentType.text,
    validate: (input) => {
      const parseResult = textAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: attachment.data.content };
        },
      };
    },
    getTools: () => [],
  };
};
