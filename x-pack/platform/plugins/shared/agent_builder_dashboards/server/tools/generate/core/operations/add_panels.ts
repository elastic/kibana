/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { defineOperation } from './types';
import {
  panelConfigPanelInputSchema,
  panelRequestSchema,
  PANEL_TYPE_TO_EMBEDDABLE_TYPE,
} from './panel_kinds';
import { getResolvedPanelCreationRequests } from './panel_creation';

const sectionIdField = z
  .string()
  .optional()
  .describe(
    'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
  );

const addPanelsItemSchema = z.discriminatedUnion('kind', [
  panelConfigPanelInputSchema.extend({ sectionId: sectionIdField }),
  panelRequestSchema.extend({ sectionId: sectionIdField }),
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
      getResolvedPanelCreationRequests({
        resolvedRequestsByOperationIndex: context.resolvedPanelCreationRequests,
        operationIndex,
      }).map((resolvedRequest) => [resolvedRequest.request.panelInputIndex, resolvedRequest])
    );

    for (const [panelInputIndex, item] of operation.panels.entries()) {
      let panelContent: Pick<AttachmentPanel, 'type' | 'config'>;

      if (item.kind === 'panelConfig') {
        panelContent = { type: PANEL_TYPE_TO_EMBEDDABLE_TYPE[item.type], config: item.config };
      } else {
        const resolvedRequest = resolvedRequestsByInputIndex.get(panelInputIndex);
        if (!resolvedRequest) {
          throw new Error(
            `Missing pre-resolved panel request for ${operation.operation} operation at index ${operationIndex}, panel input index ${panelInputIndex}.`
          );
        }
        if (resolvedRequest.resolvedPanel.type === 'failure') {
          context.failures.push(resolvedRequest.resolvedPanel.failure);
          continue;
        }
        panelContent = resolvedRequest.resolvedPanel.panelContent;
      }

      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: [{ id: uuidv4(), ...panelContent, grid: item.grid }],
        sectionId: item.sectionId,
      });
    }

    return nextDashboardData;
  },
});
