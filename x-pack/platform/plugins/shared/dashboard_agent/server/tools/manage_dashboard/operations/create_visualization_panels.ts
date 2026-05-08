/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { visualizationPanelInputSchema } from './add_section';
import {
  getResolvedVisualizationCreationRequests,
  materializeResolvedVisualizationPanels,
} from './visualization_creation';
import { defineOperation } from './types';

export const createVisualizationPanelSchema = visualizationPanelInputSchema.extend({
  sectionId: z
    .string()
    .optional()
    .describe(
      'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
    ),
});

export type CreateVisualizationPanelInput = z.infer<typeof createVisualizationPanelSchema>;

export const createVisualizationPanelsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('create_visualization_panels'),
    panels: z.array(createVisualizationPanelSchema).min(1),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextDashboardData = dashboardData;
    const panelsToAdd = materializeResolvedVisualizationPanels({
      resolvedRequests: getResolvedVisualizationCreationRequests({
        resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
        operationIndex,
        operationType: operation.operation,
      }),
      failures: context.failures,
    });

    for (const { request, panel } of panelsToAdd) {
      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: [panel],
        sectionId:
          request.operationType === 'create_visualization_panels' ? request.sectionId : undefined,
      });
    }

    return nextDashboardData;
  },
});
