/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { AttachmentType } from '@kbn/onechat-common/artifacts/attachments';
import type { InlineAttachmentTypeDefinition } from '@kbn/onechat-server/artifacts';

const contextDataSchema = z.object({
  context: z.string(),
});

export interface ContextData {
  context: string;
}

export const createContextAttachmentType = (): InlineAttachmentTypeDefinition<ContextData> => {
  return {
    id: AttachmentType.context,
    type: 'inline',
    validate: (input) => {
      const parseResult = contextDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (input) => {
      // simplest formatting now, need to improve later.
      return { type: 'text', value: input.context };
    },
  };
};
