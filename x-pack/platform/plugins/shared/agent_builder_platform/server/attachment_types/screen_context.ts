/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  screenContextAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Creates the definition for the `screen_context` attachment type.
 */
export const createScreenContextAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.screenContext,
  ScreenContextAttachmentData
> => {
  return {
    id: AttachmentType.screenContext,
    validate: (input) => {
      const parseResult = screenContextAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatScreenContext(attachment.data) };
        },
      };
    },
    getTools: () => [],
  };
};

const formatScreenContext = (data: ScreenContextAttachmentData): string => {
  const parts: string[] = [];

  if (data.app) {
    parts.push(`App: ${data.app}`);
  }
  if (data.url) {
    parts.push(`Url: ${data.url}`);
  }
  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }
  if (data.additional_data) {
    parts.push(`Additional data: ${JSON.stringify(data.additional_data)}`);
  }

  return parts.join('\n');
};
