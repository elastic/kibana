/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  esqlVisualizationInputAttachmentDataSchema,
  type EsqlVisualizationInputAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { attachmentTools, platformCoreTools } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

export const createEsqlVisualizationInputAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.esqlVisualizationInput,
  EsqlVisualizationInputAttachmentData
> => {
  return {
    id: AttachmentType.esqlVisualizationInput,
    validate: (input) => {
      const parseResult = esqlVisualizationInputAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }

      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          const columnNames = attachment.data.columns.map((column) => column.name).join(', ');
          return {
            type: 'text',
            value: [
              'ES|QL visualization input',
              `Query: ${attachment.data.query}`,
              `Columns: ${columnNames}`,
              ...(attachment.data.chart_type
                ? [`Preferred chart type: ${attachment.data.chart_type}`]
                : []),
            ].join('\n'),
          };
        },
      };
    },
    getAgentDescription: () => {
      return `A lightweight input attachment for rendering ES|QL results as an inline visualization.
      Create this attachment with ${attachmentTools.add} after ${platformCoreTools.executeEsql} when the user should see a chart for an ES|QL result.
      Data must include the ES|QL query and returned columns: { "query": string, "columns": [{ "name": string, "type": string }], "chart_type"?: string, "time_range"?: { "from": string, "to": string } }.
      Rendering it inline displays the same ES|QL Lens suggestion UI that legacy <visualization /> tags used.`;
    },
    getTools: () => [platformCoreTools.executeEsql],
  };
};
