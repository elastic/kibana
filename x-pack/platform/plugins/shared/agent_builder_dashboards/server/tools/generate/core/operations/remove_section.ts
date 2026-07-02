/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { findSectionIndex, getWidgetsBottomY } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

export const removeSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('remove_section'),
    id: z.string().max(256).describe('Section id to remove.'),
    panelAction: z
      .enum(['promote', 'delete'])
      .describe('How to handle section panels: promote to top-level or delete them.'),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    const sectionIndex = findSectionIndex(dashboardData.panels, operation.id);
    // Bad section target is a soft failure: record it and leave the dashboard unchanged.
    if (sectionIndex === -1) {
      context.failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.removeSection,
        identifier: operation.id,
        error: `Section "${operation.id}" not found.`,
        operationIndex,
      });
      return dashboardData;
    }

    const sectionToRemove = dashboardData.panels[sectionIndex] as DashboardSection;
    const nextPanels = dashboardData.panels.filter((_, i) => i !== sectionIndex);

    if (operation.panelAction === 'delete') {
      return {
        ...dashboardData,
        panels: nextPanels,
      };
    }

    const baseY = getWidgetsBottomY(nextPanels);
    const promotedPanels = sectionToRemove.panels.map((panel) => ({
      ...panel,
      grid: {
        ...panel.grid,
        y: baseY + panel.grid.y,
      },
    }));

    return {
      ...dashboardData,
      panels: [...nextPanels, ...promotedPanels],
    };
  },
});
