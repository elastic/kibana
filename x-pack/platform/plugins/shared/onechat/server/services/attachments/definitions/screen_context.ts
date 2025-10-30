/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { AttachmentType } from '@kbn/onechat-common/attachments';
import type { ScreenContextAttachmentData } from '@kbn/onechat-common/attachments';
import type { InlineAttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

const contextDataSchema = z
  .object({
    url: z.string().optional(),
    app: z.string().optional(),
    description: z.string().optional(),
    additional_data: z.record(z.string()).optional(),
  })
  .refine((data) => {
    // at least one of the fields must be present
    return data.url || data.app || data.description || data.additional_data;
  });

/**
 * Creates the definition for the `screen_context` attachment type.
 */
export const createScreenContextAttachmentType =
  (): InlineAttachmentTypeDefinition<ScreenContextAttachmentData> => {
    return {
      id: AttachmentType.screenContext,
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
        const parts: string[] = [];

        if (input.app) {
          parts.push(`App: ${input.app}`);
        }
        if (input.url) {
          parts.push(`Url: ${input.url}`);
        }
        if (input.description) {
          parts.push(`Description: ${input.description}`);
        }
        if (input.additional_data) {
          parts.push(`Additional data: ${JSON.stringify(input.additional_data)}`);
        }

        // could improve later
        return { type: 'text', value: parts.join('\n') };
      },
    };
  };
