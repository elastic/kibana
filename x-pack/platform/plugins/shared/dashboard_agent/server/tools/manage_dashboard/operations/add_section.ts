/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DashboardSection } from '@kbn/dashboard-agent-common';
import {
  getResolvedVisualizationCreationRequests,
  materializeResolvedVisualizationPanels,
} from './visualization_creation';
import type { OperationHandler } from './types';

export const addSectionHandler: OperationHandler<'add_section'> = ({
  dashboardData,
  operation,
  operationIndex,
  context,
}) => {
  let nextSection: DashboardSection = {
    id: uuidv4(),
    title: operation.title,
    collapsed: false,
    grid: operation.grid,
    panels: [],
  };

  if (operation.panels) {
    const sectionPanels = materializeResolvedVisualizationPanels({
      resolvedRequests: getResolvedVisualizationCreationRequests({
        resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
        operationIndex,
        operationType: operation.operation,
      }),
      failures: context.failures,
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
};
