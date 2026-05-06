/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardSection } from '@kbn/dashboard-agent-common';
import { findSectionIndex, getWidgetsBottomY } from '../dashboard_state';
import type { OperationHandler } from './types';

export const removeSectionHandler: OperationHandler<'remove_section'> = ({
  dashboardData,
  operation,
}) => {
  const sectionIndex = findSectionIndex(dashboardData.panels, operation.id);
  if (sectionIndex === -1) {
    throw new Error(`Section "${operation.id}" not found.`);
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
};
