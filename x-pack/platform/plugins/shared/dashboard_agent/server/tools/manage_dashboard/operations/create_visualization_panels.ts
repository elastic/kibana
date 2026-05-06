/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendPanelsToDashboard } from '../dashboard_state';
import {
  getResolvedVisualizationCreationRequests,
  materializeResolvedVisualizationPanels,
} from './visualization_creation';
import type { OperationHandler } from './types';

export const createVisualizationPanelsHandler: OperationHandler<'create_visualization_panels'> = ({
  dashboardData,
  operation,
  operationIndex,
  context,
}) => {
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
};
