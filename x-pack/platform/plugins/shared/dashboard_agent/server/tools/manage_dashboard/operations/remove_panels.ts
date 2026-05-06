/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removePanelsFromDashboard } from '../dashboard_state';
import type { OperationHandler } from './types';

export const removePanelsHandler: OperationHandler<'remove_panels'> = ({
  dashboardData,
  operation,
  context,
}) => {
  const { dashboardData: dashboardWithoutPanels, removedPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: operation.panelIds,
  });

  if (removedPanels.length === 0) {
    return dashboardData;
  }

  context.logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
  return dashboardWithoutPanels;
};
