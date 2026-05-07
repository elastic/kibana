/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard, findSectionIndex } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import {
  collectVisualizationCreationRequestsForPanels,
  materializePanelInputs,
  recordMissingSectionFailure,
} from './panel_materialization';
import { addPanelInputSchema, getPanelInputIdentifier } from './panel_sources';
import { defineOperation } from './types';

export const addPanelsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_panels'),
    panels: z
      .array(addPanelInputSchema)
      .min(1)
      .describe(
        'Panels to add, each with a source of markdown, attachment, or inline_visualization, plus explicit grid coordinates and an optional sectionId.'
      ),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextDashboardData = dashboardData;
    const panelsToAdd = materializePanelInputs({
      panelInputs: operation.panels,
      operationIndex,
      operationType: operation.operation,
      context,
    });

    for (const { panel, panelInput, sectionId } of panelsToAdd) {
      if (sectionId && findSectionIndex(nextDashboardData.panels, sectionId) === -1) {
        recordMissingSectionFailure({
          context,
          operationType: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
          sectionId,
          panelDescription: `${panelInput.source} panel "${getPanelInputIdentifier(panelInput)}"`,
        });
        continue;
      }

      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: [panel],
        sectionId,
      });
    }

    return nextDashboardData;
  },
  collectVisualizationCreationRequests: (operation) =>
    collectVisualizationCreationRequestsForPanels({
      operationType: operation.operation,
      panels: operation.panels,
    }),
});
