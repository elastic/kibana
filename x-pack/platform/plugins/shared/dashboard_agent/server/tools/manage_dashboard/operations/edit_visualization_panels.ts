/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createVisualizationFailureResult } from '../inline_visualization';
import { findPanelById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import type { OperationHandler } from './types';

export const editVisualizationPanelsHandler: OperationHandler<
  'edit_visualization_panels'
> = async ({ dashboardData, operation, context }) => {
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
        ...{
          ...panel,
          ...resolvedPanel.visContent,
        },
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
};
