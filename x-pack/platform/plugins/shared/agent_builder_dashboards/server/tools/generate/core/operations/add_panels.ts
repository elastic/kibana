/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { appendPanelsToDashboard, findSectionIndex, getWidgetsBottomY } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { packRows, GRID_COLUMN_COUNT } from '../layout/pack_rows';
import { defineOperation } from './types';
import { addPanelsItemSchema, addPanelsRowItemSchema } from './panels';
import { createPanelInputMaterializer } from './panel_creation';

/**
 * Bottom of the packing scope: the whole top level, or the target section's own
 * (section-relative) space. The caller has already validated that `sectionId`
 * resolves to an existing section.
 */
const getScopeBottomY = (
  dashboardData: DashboardAttachmentData,
  sectionId: string | undefined
): number => {
  if (sectionId === undefined) {
    return getWidgetsBottomY(dashboardData.panels);
  }

  const section = dashboardData.panels[findSectionIndex(dashboardData.panels, sectionId)];
  return isSection(section) ? getWidgetsBottomY(section.panels) : 0;
};

export const addPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('add_panels'),
      panels: z
        .array(addPanelsItemSchema)
        .min(1)
        .optional()
        .describe(
          'Panels with explicit per-item grid (and optional per-item sectionId). Use only when precise placement is required; prefer rows.'
        ),
      rows: z
        .array(z.array(addPanelsRowItemSchema).min(1).max(GRID_COLUMN_COUNT))
        .min(1)
        .optional()
        .describe(
          'Rows of panel items, top to bottom; items in a row are placed left to right and the server computes every grid. Provide exactly one of rows or panels.'
        ),
      sectionId: z
        .string()
        .max(256)
        .optional()
        .describe(
          'Rows mode only: section to add all rows into — an existing section id, or a ref declared by an earlier add_section in the same call. Omit to add at the top level.'
        ),
    })
    .check((ctx) => {
      const { panels, rows, sectionId } = ctx.value;

      if ((panels === undefined) === (rows === undefined)) {
        ctx.issues.push({
          code: 'custom',
          message: 'Provide exactly one of "panels" or "rows".',
          input: ctx.value,
        });
      }

      if (sectionId !== undefined && rows === undefined) {
        ctx.issues.push({
          code: 'custom',
          message:
            'Operation-level "sectionId" applies to "rows" only. With "panels", set sectionId per item.',
          input: ctx.value,
        });
      }
    }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    const materializePanelInput = createPanelInputMaterializer({
      resolvedPanelCreationRequests: context.resolvedPanelCreationRequests,
      operationIndex,
      operationType: operation.operation,
      failures: context.failures,
    });

    if (operation.rows !== undefined) {
      // Resolve a ref declared by an earlier add_section in this call, else treat as a real id.
      const sectionId =
        operation.sectionId !== undefined
          ? context.sectionRefs.get(operation.sectionId) ?? operation.sectionId
          : undefined;

      // Bad section target is a soft failure: every row targets it, so skip the whole block.
      if (sectionId !== undefined && findSectionIndex(dashboardData.panels, sectionId) === -1) {
        context.failures.push({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
          identifier: sectionId,
          error: `Section "${sectionId}" not found. The panels were not added.`,
          operationIndex,
        });
        return dashboardData;
      }

      const rowGrids = packRows(operation.rows, getScopeBottomY(dashboardData, sectionId));

      let nextDashboardData = dashboardData;
      // Row-major flattened index; must stay in sync with collectPanelCreationRequests.
      let panelInputIndex = 0;

      for (const [rowIndex, row] of operation.rows.entries()) {
        for (const [itemIndex, item] of row.entries()) {
          const grid = rowGrids[rowIndex][itemIndex];
          const panelContent = materializePanelInput(item, panelInputIndex);
          panelInputIndex += 1;
          if (panelContent === undefined) {
            continue;
          }

          nextDashboardData = appendPanelsToDashboard({
            dashboardData: nextDashboardData,
            panelsToAdd: [{ id: uuidv4(), ...panelContent, grid }],
            sectionId,
          });
        }
      }

      return nextDashboardData;
    }

    if (operation.panels === undefined) {
      // Unreachable: the schema enforces exactly one of panels | rows.
      return dashboardData;
    }

    let nextDashboardData = dashboardData;

    for (const [panelInputIndex, item] of operation.panels.entries()) {
      const panelContent = materializePanelInput(item, panelInputIndex);
      if (panelContent === undefined) {
        continue;
      }

      // Resolve a ref declared by an earlier add_section in this call, else treat as a real id.
      const sectionId =
        item.sectionId !== undefined
          ? context.sectionRefs.get(item.sectionId) ?? item.sectionId
          : undefined;

      // Bad section target is a soft failure: skip this panel, keep the rest.
      if (sectionId !== undefined && findSectionIndex(nextDashboardData.panels, sectionId) === -1) {
        context.failures.push({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
          identifier: sectionId,
          error: `Section "${sectionId}" not found. The panel was not added.`,
          operationIndex,
        });
        continue;
      }

      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: [{ id: uuidv4(), ...panelContent, grid: item.grid }],
        sectionId,
      });
    }

    return nextDashboardData;
  },
});
