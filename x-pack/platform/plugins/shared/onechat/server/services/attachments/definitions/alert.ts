/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType, alertAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import { platformCoreTools } from '@kbn/onechat-common/tools';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';

/**
 * Creates the definition for the `alert` attachment type.
 */
export const createAlertAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.alert,
  AlertAttachmentData
> => {
  return {
    id: AttachmentType.alert,
    validate: (input) => {
      const parseResult = alertAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAlertAttachment(attachment.data) };
        },
      };
    },
    getTools: () => {
      return [platformCoreTools.executeEsql, platformCoreTools.generateEsql];
    },
    getAgentDescription: () => {
      return `${AttachmentType.alert} can be executed using the ${sanitizeToolId(
        platformCoreTools.generateEsql
      )} and ${sanitizeToolId(platformCoreTools.executeEsql)} tool`;
    },
  };
};

const formatAlertAttachment = (data: AlertAttachmentData): string => {
  return `\`\`\`\n${data.alert}\n\`\`\``;
};
