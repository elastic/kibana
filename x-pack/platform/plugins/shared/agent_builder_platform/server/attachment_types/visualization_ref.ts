/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationRefAttachmentData } from '@kbn/onechat-common/attachments';
import {
  AttachmentType,
  visualizationRefAttachmentDataSchema,
} from '@kbn/onechat-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

/**
 * Creates the definition for the `visualization_ref` attachment type.
 *
 * This attachment type represents a reference to a saved visualization object
 * (lens, visualization, or map). It stores the saved object ID and type,
 * with optional cached metadata (title, description).
 *
 * The content is resolved on-demand when the attachment is read by loading
 * the saved object from Elasticsearch.
 */
export const createVisualizationRefAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.visualizationRef,
  VisualizationRefAttachmentData
> => {
  return {
    id: AttachmentType.visualizationRef,
    validate: (input) => {
      const parseResult = visualizationRefAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatVisualizationRefAttachment(attachment.data) };
        },
      };
    },
    getAgentDescription: () => {
      return `A visualization_ref attachment contains a reference to a saved visualization (lens, visualization, or map). The reference includes the saved object ID and type. The user is asking about or referencing this visualization.`;
    },
    getTools: () => [],
  };
};

/**
 * Formats the visualization reference attachment for display to the LLM
 */
const formatVisualizationRefAttachment = (data: VisualizationRefAttachmentData): string => {
  const parts: string[] = [];

  // Header with type and ID
  parts.push(`[Visualization Reference]`);
  parts.push(`Type: ${data.saved_object_type}`);
  parts.push(`ID: ${data.saved_object_id}`);

  // Add title if available
  if (data.title) {
    parts.push(`Title: ${data.title}`);
  }

  // Add description if available
  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  // Add resolved content if available
  if (data.resolved_content) {
    parts.push(`\nResolved Content:`);
    parts.push('```json');
    parts.push(JSON.stringify(data.resolved_content, null, 2));
    parts.push('```');
  }

  return parts.join('\n');
};
