/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { sectionGridSchema } from '@kbn/dashboard-agent-common';
import type { DashboardSection } from '@kbn/dashboard-agent-common';
import { z } from '@kbn/zod/v4';
import {
  collectVisualizationCreationRequestsForPanels,
  materializePanelInputs,
} from './panel_materialization';
import { sectionPanelInputSchema } from './panel_sources';
import { defineOperation } from './types';

export const addSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_section'),
    title: z.string().describe('Section title.'),
    grid: sectionGridSchema,
    panels: z
      .array(sectionPanelInputSchema)
      .min(1)
      .optional()
      .describe(
        'Optional panels to create inside the new section. Panel grids are section-relative.'
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
      const sectionPanels = materializePanelInputs({
        panelInputs: operation.panels,
        operationIndex,
        operationType: operation.operation,
        context,
      }).map(({ panel }) => panel);

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
  collectVisualizationCreationRequests: (operation) =>
    operation.panels
      ? collectVisualizationCreationRequestsForPanels({
          operationType: operation.operation,
          panels: operation.panels,
        })
      : [],
});
