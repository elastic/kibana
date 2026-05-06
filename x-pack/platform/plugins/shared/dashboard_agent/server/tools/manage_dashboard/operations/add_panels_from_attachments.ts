/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendPanelsToDashboard } from '../dashboard_state';
import type { OperationHandler } from './types';

export const addPanelsFromAttachmentsHandler: OperationHandler<'add_panels_from_attachments'> = ({
  dashboardData,
  operation,
  context,
}) => {
  let nextDashboardData = dashboardData;

  for (const item of operation.items) {
    const result = context.resolvePanelsFromAttachments([
      {
        attachmentId: item.attachmentId,
        grid: item.grid,
      },
    ]);

    if (result.panels.length > 0) {
      nextDashboardData = appendPanelsToDashboard({
        dashboardData: nextDashboardData,
        panelsToAdd: result.panels,
        sectionId: item.sectionId,
      });
    }

    context.failures.push(...result.failures);
  }

  return nextDashboardData;
};
