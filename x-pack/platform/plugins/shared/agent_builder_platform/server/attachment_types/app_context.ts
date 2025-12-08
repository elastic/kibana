/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  applicationContextAttachmentDataSchema,
} from '@kbn/onechat-common/attachments/attachment_types';
import type { ApplicationContextAttachmentData } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

/**
 * Creates the definition for the `screen_context` attachment type.
 */
export const createApplicationContextAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.applicationContext,
  ApplicationContextAttachmentData
> => {
  return {
    id: AttachmentType.applicationContext,
    validate: (input) => {
      const parseResult = applicationContextAttachmentDataSchema.safeParse(input);
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

const formatScreenContext = (data: ApplicationContextAttachmentData): string => {
  const parts: string[] = [];

  if (data.app_id) {
    parts.push(`App: ${data.app_id}`);
  }
  if (data.location) {
    parts.push(`Path: ${data.location}`);
  }
  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  return parts.join('\n');
};
