/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { TextAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import type { InlineAttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

const textDataSchema = z.object({
  content: z.string(),
});

/**
 * Creates the definition for the `text` attachment type.
 */
export const createTextAttachmentType = (): InlineAttachmentTypeDefinition<TextAttachmentData> => {
  return {
    id: AttachmentType.text,
    type: 'inline',
    validate: (input) => {
      const parseResult = textDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (input) => {
      return { type: 'text', value: input.content };
    },
  };
};
