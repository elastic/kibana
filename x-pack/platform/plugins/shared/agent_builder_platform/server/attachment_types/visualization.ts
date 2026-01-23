/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  visualizationAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Creates the definition for the `visualization` attachment type.
 */
export const createVisualizationAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.visualization,
  VisualizationAttachmentData
> => {
  return {
    id: AttachmentType.visualization,
    validate: (input) => {
      const parseResult = visualizationAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatVisualizationAttachment(attachment.data) };
        },
      };
    },
    getTools: () => [],
  };
};

const formatVisualizationAttachment = (data: VisualizationAttachmentData): string => {
  const summary = `Visualization (${data.chart_type}): ${data.query}`;
  const esqlSection = `ES|QL: \`\`\`esql\n${data.esql}\n\`\`\``;
  return `${summary}\n${esqlSection}`;
};
