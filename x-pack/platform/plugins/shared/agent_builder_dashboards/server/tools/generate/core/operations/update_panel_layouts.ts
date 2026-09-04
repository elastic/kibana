/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { panelGridSchema, sectionGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import {
  appendPanelsToDashboard,
  findSectionIndex,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

const BOTH_SECTION_TARGETS_ERROR =
  'Use sectionId for an existing section, or newSectionKey for a new section from newSections[], not both.';

const layoutPanelItemSchema = z
  .object({
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
        'Move panel to an existing section by its id. The section must already exist. null promotes to top level. Omit to keep the current location. Do not invent a sectionId — use newSectionKey with newSections[] to create a section in this operation.'
      ),
    newSectionKey: z
      .string()
      .max(64)
      .optional()
      .describe(
        "Local alias of a section from this operation's newSections[]. Not a persisted section id. Cannot be combined with sectionId."
      ),
  })
  .check((ctx) => {
    if (ctx.value.sectionId !== undefined && ctx.value.newSectionKey !== undefined) {
      ctx.issues.push({
        code: 'custom',
        message: BOTH_SECTION_TARGETS_ERROR,
        input: ctx.value,
        path: ['newSectionKey'],
      });
    }
  });

const newSectionsSchema = z
  .array(
    z.object({
      key: z
        .string()
        .min(1)
        .max(64)
        .describe(
          'Local alias for this operation only. Use it as newSectionKey on panels. Do not treat it as a persisted section id.'
        ),
      title: z.string().max(256).describe('Section title.'),
      grid: sectionGridSchema,
    })
  )
  .max(32)
  .check((ctx) => {
    const seen = new Set<string>();
    for (const [index, section] of ctx.value.entries()) {
      if (seen.has(section.key)) {
        ctx.issues.push({
          code: 'custom',
          message: `Duplicate newSections key "${section.key}".`,
          input: section.key,
          path: [index, 'key'],
        });
      }
      seen.add(section.key);
    }
  });

export const updatePanelLayoutsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('update_panel_layouts'),
    newSections: newSectionsSchema
      .optional()
      .describe(
        "Sections to create in this operation before applying panel moves. Reference each item's key with newSectionKey. The server generates real section ids."
      ),
    panels: z.array(layoutPanelItemSchema).min(1),
  }),
  handler: ({ dashboardData, operation, context }) => {
    let nextDashboardData = dashboardData;

    const recordFailure = (identifier: string, error: string) => {
      context.failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.updatePanelLayouts,
        identifier,
        error,
      });
    };

    const newSectionIdsByKey = new Map<string, string>();
    for (const newSection of operation.newSections ?? []) {
      const sectionId = uuidv4();
      newSectionIdsByKey.set(newSection.key, sectionId);
      nextDashboardData = {
        ...nextDashboardData,
        panels: [
          ...nextDashboardData.panels,
          {
            id: sectionId,
            title: newSection.title,
            collapsed: false,
            grid: newSection.grid,
            panels: [],
          },
        ],
      };
    }

    for (const { panelId, grid, sectionId, newSectionKey } of operation.panels) {
      if (sectionId !== undefined && newSectionKey !== undefined) {
        recordFailure(panelId, BOTH_SECTION_TARGETS_ERROR);
        continue;
      }

      let targetSectionId: string | null | undefined;
      if (newSectionKey !== undefined) {
        const resolvedSectionId = newSectionIdsByKey.get(newSectionKey);
        if (resolvedSectionId === undefined) {
          recordFailure(panelId, `New section key "${newSectionKey}" not found.`);
          continue;
        }
        targetSectionId = resolvedSectionId;
      } else {
        targetSectionId = sectionId;
      }

      if (targetSectionId === undefined) {
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId,
          transformPanel: (panel) => ({
            ...panel,
            ...(grid ? { grid } : {}),
          }),
        });

        if (!updateResult.updated) {
          recordFailure(panelId, `Panel "${panelId}" not found.`);
          continue;
        }

        nextDashboardData = updateResult.dashboardData;
        continue;
      }

      if (
        targetSectionId !== null &&
        findSectionIndex(nextDashboardData.panels, targetSectionId) === -1
      ) {
        recordFailure(panelId, `Section "${targetSectionId}" not found.`);
        continue;
      }

      const { dashboardData: dashboardAfterRemoval, removedPanels } = removePanelsFromDashboard({
        dashboardData: nextDashboardData,
        panelIdsToRemove: [panelId],
      });

      if (removedPanels.length === 0) {
        recordFailure(panelId, `Panel "${panelId}" not found.`);
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
        sectionId: targetSectionId ?? undefined,
      });
    }

    return nextDashboardData;
  },
});
