/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { EsqlAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, esqlAttachmentDataSchema } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';

/**
 * Creates the definition for the `text` attachment type.
 */
export const createEsqlAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.esql,
  EsqlAttachmentData
> => {
  return {
    id: AttachmentType.esql,
    validate: async (input) => {
      const parseResult = esqlAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        return { valid: false, error: parseResult.error.message };
      }

      const validationResult = await validateQuery(parseResult.data.query);
      if (validationResult.errors.length > 0) {
        const message = `Query validation returned errors: \n${validationResult.errors
          .map((error) => ('text' in error ? error.text : 'message' in error ? error.message : ''))
          .join('\n')}`;
        return { valid: false, error: message };
      }

      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatEsqlAttachment(attachment.data) };
        },
      };
    },
    getAgentDescription: () => {
      return `${AttachmentType.esql} can be executed using the ${sanitizeToolId(
        platformCoreTools.executeEsql
      )} tool`;
    },
    getTools: () => [platformCoreTools.executeEsql],
  };
};

const formatEsqlAttachment = (data: EsqlAttachmentData): string => {
  let formatted = data.description ? `${data.description}\n` : '';
  formatted += `\`\`\`esql\n${data.query}\n\`\`\``;
  return formatted;
};
