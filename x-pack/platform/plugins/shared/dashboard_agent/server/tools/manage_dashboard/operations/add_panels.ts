/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { defineOperation } from './types';
import {
  attachmentPanelInputSchema,
  markdownPanelInputSchema,
  visualizationPanelInputSchema,
} from './panel_kinds';
import { getResolvedVisualizationCreationRequests } from './visualization_creation';

const sectionIdField = z
  .string()
  .optional()
  .describe(
    'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
  );

const addPanelsItemSchema = z.discriminatedUnion('kind', [
  markdownPanelInputSchema.extend({ sectionId: sectionIdField }),
  attachmentPanelInputSchema.extend({ sectionId: sectionIdField }),
  visualizationPanelInputSchema.extend({ sectionId: sectionIdField }),
]);

export type AddPanelsItemInput = z.infer<typeof addPanelsItemSchema>;

export const addPanelsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_panels'),
    panels: z.array(addPanelsItemSchema).min(1),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextDashboardData = dashboardData;
    const resolvedRequestsByInputIndex = new Map(
      getResolvedVisualizationCreationRequests({
        resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
        operationIndex,
      }).map((resolvedRequest) => [resolvedRequest.request.panelInputIndex, resolvedRequest])
    );

    for (const [panelInputIndex, item] of operation.panels.entries()) {
      switch (item.kind) {
        case 'markdown':
          nextDashboardData = appendPanelsToDashboard({
            dashboardData: nextDashboardData,
            panelsToAdd: [
              {
                id: uuidv4(),
                type: MARKDOWN_EMBEDDABLE_TYPE,
                config: { content: item.markdownContent },
                grid: item.grid,
              },
            ],
            sectionId: item.sectionId,
          });
          break;
        case 'attachment': {
          const result = context.resolvePanelsFromAttachments([
            { attachmentId: item.attachmentId, grid: item.grid },
          ]);
          if (result.panels.length > 0) {
            nextDashboardData = appendPanelsToDashboard({
              dashboardData: nextDashboardData,
              panelsToAdd: result.panels,
              sectionId: item.sectionId,
            });
          }
          context.failures.push(...result.failures);
          break;
        }
        case 'visualization': {
          const resolvedRequest = resolvedRequestsByInputIndex.get(panelInputIndex);
          if (!resolvedRequest) {
            throw new Error(
              `Missing pre-resolved visualization request for ${operation.operation} operation at index ${operationIndex}, panel input index ${panelInputIndex}.`
            );
          }
          if (resolvedRequest.resolvedPanel.type === 'failure') {
            context.failures.push(resolvedRequest.resolvedPanel.failure);
          } else {
            nextDashboardData = appendPanelsToDashboard({
              dashboardData: nextDashboardData,
              panelsToAdd: [
                {
                  id: uuidv4(),
                  type: resolvedRequest.resolvedPanel.visContent.type,
                  config: resolvedRequest.resolvedPanel.visContent.config,
                  grid: item.grid,
                },
              ],
              sectionId: item.sectionId,
            });
          }
          break;
        }
      }
    }

    return nextDashboardData;
  },
});
