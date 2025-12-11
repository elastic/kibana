/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  timeRangeAttachmentDataSchema,
} from '@kbn/onechat-common/attachments/attachment_types';
import type { TimerangeAttachmentData } from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

/**
 * Creates the definition for the `screen_context` attachment type.
 */
export const createTimerangeAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.timeRange,
  TimerangeAttachmentData
> => {
  return {
    id: AttachmentType.timeRange,
    validate: (input) => {
      const parseResult = timeRangeAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatTimerange(attachment.data) };
        },
      };
    },
    getTools: () => [],
    getAgentDescription: () => {
      return '';
    },
  };
};

const formatTimerange = (data: TimerangeAttachmentData): string => {
  let formatted = '';
  if (data.description) {
    formatted += `description: ${data.description}\n`;
  }
  formatted += `From: ${data.start}\nTo: ${data.end}\n`;
  return formatted;
};
