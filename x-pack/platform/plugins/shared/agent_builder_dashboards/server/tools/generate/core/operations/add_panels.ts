/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { defineOperation } from './types';
import { addPanelsItemSchema } from './panels';
import { createPanelInputMaterializer, applyCustomContentTemplates } from './panel_creation';

export const addPanelsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_panels'),
    panels: z.array(addPanelsItemSchema).min(1),
  }),
  handler: async ({ dashboardData, operation, operationIndex, context }) => {
    const materializePanelInput = createPanelInputMaterializer({
      resolvedPanelCreationRequests: context.resolvedPanelCreationRequests,
      operationIndex,
      operationType: operation.operation,
      failures: context.failures,
      resolveAttachmentPanel: context.resolveAttachmentPanel,
    });

    const materialized = operation.panels.map((item, i) => ({
      item,
      panel: materializePanelInput(item, i),
    }));

    if (context.resolveCustomContentTemplate) {
      await applyCustomContentTemplates(
        materialized,
        context.resolveCustomContentTemplate,
        context.failures
      );
    }

    let nextDashboardData = dashboardData;

    for (const { item, panel } of materialized) {
      if (panel === undefined) continue;

      const panelId = uuidv4();
      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: [{ id: panelId, ...panel.panelContent, grid: item.grid }],
        sectionId: item.sectionId,
      });
      if (panel.authoringNote) {
        context.panelAuthoringNotes.push({
          panelId,
          authoringNote: panel.authoringNote,
        });
      }
    }

    return nextDashboardData;
  },
});
