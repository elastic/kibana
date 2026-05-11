/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import { createVisualizationFailureResult } from '../inline_visualization';
import { findPanelById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { defineOperation } from './types';

const editVisualizationPanelSchema = z.object({
  panelId: z.string().describe('Existing panel id to update.'),
  query: z
    .string()
    .describe('A natural language query describing how to update the visualization.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export const editVisualizationPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('edit_visualization_panels'),
      panels: z.array(editVisualizationPanelSchema).min(1),
    })
    .describe(
      'Update existing ES|QL-backed Lens visualization panels by panelId. DSL, form-based, and other non-ES|QL panels are not supported for direct editing and should be recreated as new ES|QL-based Lens panels instead.'
    ),
  handler: async ({ dashboardData, operation, context }) => {
    const { resolveVisualizationConfig } = context;
    let nextDashboardData = dashboardData;

    if (!resolveVisualizationConfig) {
      throw new Error(
        'Inline visualization resolver is required for edit_visualization_panels operations.'
      );
    }

    for (const panelInput of operation.panels) {
      const existingPanel = findPanelById(nextDashboardData.panels, panelInput.panelId);
      if (!existingPanel) {
        const failureResult = createVisualizationFailureResult(
          DASHBOARD_OPERATION_FAILURE_TYPES.editVisualizationPanels,
          panelInput.panelId,
          `Panel "${panelInput.panelId}" not found.`
        );
        if (failureResult.type === 'failure') {
          context.failures.push(failureResult.failure);
        }
        continue;
      }

      const resolvedPanel = await resolveVisualizationConfig({
        operationType: operation.operation,
        identifier: panelInput.panelId,
        nlQuery: panelInput.query,
        chartType: panelInput.chartType,
        esql: panelInput.esql,
        existingPanel,
      });

      if (resolvedPanel.type === 'failure') {
        context.failures.push(resolvedPanel.failure);
        continue;
      }

      const updateResult = updatePanelInDashboard({
        dashboardData: nextDashboardData,
        panelId: panelInput.panelId,
        transformPanel: (panel) => ({
          ...panel,
          ...resolvedPanel.visContent,
        }),
      });

      if (!updateResult.updated) {
        context.failures.push({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editVisualizationPanels,
          identifier: panelInput.panelId,
          error: `Panel "${panelInput.panelId}" not found.`,
        });
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
    }

    return nextDashboardData;
  },
});
