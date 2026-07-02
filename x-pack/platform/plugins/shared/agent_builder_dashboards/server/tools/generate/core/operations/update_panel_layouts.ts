/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import {
  appendPanelsToDashboard,
  findSectionIndex,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

export const updatePanelLayoutsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('update_panel_layouts'),
    panels: z
      .array(
        z.object({
          panelId: z.string().max(256).describe('ID of the panel to update.'),
          grid: panelGridSchema
            .optional()
            .describe('New grid position/size. Omit to keep the current grid.'),
          sectionId: z
            .string()
            .max(256)
            .nullable()
            .optional()
            .describe(
              'Move panel into a section: an existing section id, or a ref declared by an earlier add_section in the same call. null promotes to top level. Omit to keep the current location.'
            ),
        })
      )
      .min(1),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextDashboardData = dashboardData;

    const recordFailure = (panelId: string, error: string) => {
      context.failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.updatePanelLayouts,
        identifier: panelId,
        error,
        operationIndex,
      });
    };

    const recordMissingPanelFailure = (panelId: string) => {
      recordFailure(panelId, `Panel "${panelId}" not found.`);
    };

    for (const { panelId, grid, sectionId: rawSectionId } of operation.panels) {
      // Resolve a ref declared by an earlier add_section in this call, else treat as a real id.
      const sectionId =
        typeof rawSectionId === 'string'
          ? context.sectionRefs.get(rawSectionId) ?? rawSectionId
          : rawSectionId;

      // sectionId omitted: do not move the panel
      if (sectionId === undefined) {
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId,
          transformPanel: (panel) => ({
            ...panel,
            ...(grid ? { grid } : {}),
          }),
        });

        if (!updateResult.updated) {
          recordMissingPanelFailure(panelId);
          continue;
        }

        nextDashboardData = updateResult.dashboardData;
        continue;
      }

      // sectionId provided: move the panel to that section, or to the top level when null.
      // Bad section target is a soft failure: skip this move, keep the rest.
      if (sectionId !== null && findSectionIndex(nextDashboardData.panels, sectionId) === -1) {
        recordFailure(
          panelId,
          `Section "${sectionId}" not found. Panel "${panelId}" was not moved.`
        );
        continue;
      }

      const removalResult = removePanelsFromDashboard({
        dashboardData: nextDashboardData,
        panelIdsToRemove: [panelId],
      });
      const { dashboardData: dashboardAfterRemoval, removedPanels } = removalResult;

      if (removedPanels.length === 0) {
        recordMissingPanelFailure(panelId);
        continue;
      }

      const [panelToMove] = removedPanels;
      nextDashboardData = appendPanelsToDashboard({
        dashboardData: dashboardAfterRemoval,
        panelsToAdd: [
          {
            ...panelToMove,
            ...(grid ? { grid } : {}),
          },
        ],
        // sectionId targets a section; null promotes the panel to the top level
        sectionId: sectionId ?? undefined,
      });
    }

    return nextDashboardData;
  },
});
