/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { sectionGridSchema } from '@kbn/dashboard-agent-common';
import type { AttachmentPanel, DashboardSection } from '@kbn/dashboard-agent-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { z } from '@kbn/zod/v4';
import { getResolvedVisualizationCreationRequests } from './visualization_creation';
import { defineOperation } from './types';
import {
  attachmentPanelInputSchema,
  markdownPanelInputSchema,
  visualizationPanelInputSchema,
} from './panel_kinds';

const addSectionPanelItemSchema = z.discriminatedUnion('kind', [
  markdownPanelInputSchema,
  attachmentPanelInputSchema,
  visualizationPanelInputSchema,
]);

export const addSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_section'),
    title: z.string().describe('Section title.'),
    grid: sectionGridSchema,
    panels: z
      .array(addSectionPanelItemSchema)
      .min(1)
      .optional()
      .describe(
        'Optional inline panels (markdown, attachment, or visualization) to create inside the new section. Panel grids are section-relative.'
      ),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextSection: DashboardSection = {
      id: uuidv4(),
      title: operation.title,
      collapsed: false,
      grid: operation.grid,
      panels: [],
    };

    if (operation.panels) {
      const resolvedRequestsByInputIndex = new Map(
        getResolvedVisualizationCreationRequests({
          resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
          operationIndex,
        }).map((resolvedRequest) => [resolvedRequest.request.panelInputIndex, resolvedRequest])
      );

      const sectionPanels: AttachmentPanel[] = [];

      for (const [panelInputIndex, item] of operation.panels.entries()) {
        switch (item.kind) {
          case 'markdown':
            sectionPanels.push({
              id: uuidv4(),
              type: MARKDOWN_EMBEDDABLE_TYPE,
              config: { content: item.markdownContent },
              grid: item.grid,
            });
            break;
          case 'attachment': {
            const result = context.resolvePanelsFromAttachments([
              { attachmentId: item.attachmentId, grid: item.grid },
            ]);
            sectionPanels.push(...result.panels);
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
              sectionPanels.push({
                id: uuidv4(),
                type: resolvedRequest.resolvedPanel.visContent.type,
                config: resolvedRequest.resolvedPanel.visContent.config,
                grid: item.grid,
              });
            }
            break;
          }
        }
      }

      nextSection = {
        ...nextSection,
        panels: sectionPanels,
      };
    }

    return {
      ...dashboardData,
      panels: [...dashboardData.panels, nextSection],
    };
  },
});
