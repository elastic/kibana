/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

const visualizationAttachmentType = 'visualization' as const;

interface VisualizationAttachmentData {
  query: string;
  visualization: Record<string, unknown>;
  chart_type: string;
  esql: string;
}

const visualizationAttachmentDataSchema = z.object({
  query: z.string(),
  visualization: z.record(z.unknown()),
  chart_type: z.string(),
  esql: z.string(),
});

export const createVisualizationAttachmentType = (): AttachmentTypeDefinition<
  typeof visualizationAttachmentType,
  VisualizationAttachmentData
> => {
  return {
    id: visualizationAttachmentType,
    validate: async (input) => {
      const parseResult = visualizationAttachmentDataSchema.safeParse(input);
      if (!parseResult.success) {
        return { valid: false, error: parseResult.error.message };
      }

      return { valid: true, data: parseResult.data };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return {
            type: 'text',
            value: [
              'Visualization attachment',
              `Query: ${attachment.data.query}`,
              `Chart type: ${attachment.data.chart_type}`,
              `ES|QL: ${attachment.data.esql}`,
            ].join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return 'Visualization attachments can be rendered by referencing their attachment id.';
    },
  };
};
