/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { sectionGridSchema } from '@kbn/agent-builder-dashboards-common';
import type { AttachmentPanel, DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { getResolvedPanelCreationRequests } from './panel_creation';
import { defineOperation } from './types';
import { addSectionPanelItemSchema, PANEL_TYPE_TO_EMBEDDABLE_TYPE } from './panels';

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
        'Optional inline panels (panelConfig or panelRequest) to create inside the new section. Panel grids are section-relative.'
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
        getResolvedPanelCreationRequests({
          resolvedRequestsByOperationIndex: context.resolvedPanelCreationRequests,
          operationIndex,
        }).map((resolvedRequest) => [resolvedRequest.request.panelInputIndex, resolvedRequest])
      );

      const sectionPanels: AttachmentPanel[] = [];

      for (const [panelInputIndex, item] of operation.panels.entries()) {
        switch (item.kind) {
          case 'panelConfig':
            sectionPanels.push({
              id: uuidv4(),
              type: PANEL_TYPE_TO_EMBEDDABLE_TYPE[item.type],
              config: item.config,
              grid: item.grid,
            });
            break;
          case 'panelRequest': {
            const resolvedRequest = resolvedRequestsByInputIndex.get(panelInputIndex);
            if (!resolvedRequest) {
              throw new Error(
                `Missing pre-resolved panel request for ${operation.operation} operation at index ${operationIndex}, panel input index ${panelInputIndex}.`
              );
            }
            if (resolvedRequest.resolvedPanel.type === 'failure') {
              context.failures.push(resolvedRequest.resolvedPanel.failure);
            } else {
              sectionPanels.push({
                id: uuidv4(),
                type: resolvedRequest.resolvedPanel.panelContent.type,
                config: resolvedRequest.resolvedPanel.panelContent.config,
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
