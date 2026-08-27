/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema, type AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import {
  appendPanelsToDashboard,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const patchPrimaryMetric = ({
  metrics,
  clearMetricFill,
  metricTrendline,
}: {
  metrics: unknown;
  clearMetricFill: boolean;
  metricTrendline: boolean;
}): unknown => {
  if (!Array.isArray(metrics) || (!clearMetricFill && !metricTrendline)) {
    return metrics;
  }

  return metrics.map((item, index) => {
    if (!isRecord(item)) {
      return item;
    }
    const isPrimary = item.type === 'primary' || (index === 0 && item.type !== 'secondary');
    if (!isPrimary) {
      return item;
    }

    const next = { ...item };
    if (clearMetricFill) {
      delete next.color;
      delete next.apply_color_to;
    }
    if (metricTrendline) {
      next.background_chart = { type: 'trend' };
    }
    return next;
  });
};

const applyLayoutUpdate = ({
  panel,
  grid,
  hideTitle,
  clearMetricFill,
  metricTrendline,
}: {
  panel: AttachmentPanel;
  grid: AttachmentPanel['grid'] | undefined;
  hideTitle: boolean | undefined;
  clearMetricFill: boolean | undefined;
  metricTrendline: boolean | undefined;
}): AttachmentPanel => {
  const shouldClearFill = clearMetricFill === true;
  const shouldAddTrendline = metricTrendline === true;
  if (hideTitle === undefined && !shouldClearFill && !shouldAddTrendline) {
    return {
      ...panel,
      ...(grid ? { grid } : {}),
    };
  }

  return {
    ...panel,
    ...(grid ? { grid } : {}),
    config: {
      ...panel.config,
      ...(hideTitle === undefined ? {} : { hide_title: hideTitle }),
      ...(shouldClearFill || shouldAddTrendline
        ? {
            metrics: patchPrimaryMetric({
              metrics: panel.config.metrics,
              clearMetricFill: shouldClearFill,
              metricTrendline: shouldAddTrendline,
            }),
          }
        : {}),
    },
  };
};

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
          hide_title: z
            .boolean()
            .optional()
            .describe(
              'Hide the dashboard panel chrome title. Use when the visualization already draws the same title inside (typical for metric/gauge). Omit to leave the current setting.'
            ),
          clear_metric_fill: z
            .boolean()
            .optional()
            .describe(
              'Strip an invented metric background color (primary `color` and `apply_color_to`). Leave the KPI on the default white background. Omit to leave color as-is.'
            ),
          metric_trendline: z
            .boolean()
            .optional()
            .describe(
              'Add a sparkline behind a sparse metric (`background_chart: { type: "trend" }` on the primary). Does not change ES|QL. Omit to leave complementary viz as-is.'
            ),
          sectionId: z
            .string()
            .max(256)
            .nullable()
            .optional()
            .describe(
              'Move panel to an existing section by its id. The section must already exist (use add_section first). null promotes to top level. Omit to keep the current location.'
            ),
        })
      )
      .min(1),
  }),
  handler: ({ dashboardData, operation, context }) => {
    let nextDashboardData = dashboardData;

    const recordMissingPanelFailure = (panelId: string) => {
      context.failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.updatePanelLayouts,
        identifier: panelId,
        error: `Panel "${panelId}" not found.`,
      });
    };

    for (const {
      panelId,
      grid,
      sectionId,
      hide_title: hideTitle,
      clear_metric_fill: clearMetricFill,
      metric_trendline: metricTrendline,
    } of operation.panels) {
      // sectionId omitted: do not move the panel
      if (sectionId === undefined) {
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId,
          transformPanel: (panel) =>
            applyLayoutUpdate({ panel, grid, hideTitle, clearMetricFill, metricTrendline }),
        });

        if (!updateResult.updated) {
          recordMissingPanelFailure(panelId);
          continue;
        }

        nextDashboardData = updateResult.dashboardData;
        continue;
      }

      // sectionId provided: move the panel to that section, or to the top level when null
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
          applyLayoutUpdate({
            panel: panelToMove,
            grid,
            hideTitle,
            clearMetricFill,
            metricTrendline,
          }),
        ],
        // sectionId targets a section; null promotes the panel to the top level
        sectionId: sectionId ?? undefined,
      });
    }

    return nextDashboardData;
  },
});
