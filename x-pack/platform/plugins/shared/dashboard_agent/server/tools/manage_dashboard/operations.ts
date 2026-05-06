/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { Logger } from '@kbn/core/server';
import type { ResolveVisualizationConfig } from './inline_visualization';
import type { VisualizationFailure } from './utils';
import type { OperationExecutionContext } from './operations/types';
import {
  collectVisualizationCreationRequests,
  dashboardOperationSchema,
  executeOperationHandler,
  type DashboardOperation,
} from './operations/registry';
import { resolveVisualizationCreationRequests } from './operations/visualization_creation';

export { dashboardOperationSchema };
export type { DashboardOperation };
export type { VisualizationPanelInput } from './operations/add_section';
export type { CreateVisualizationPanelInput } from './operations/create_visualization_panels';

interface ExecuteDashboardOperationsParams {
  dashboardData?: DashboardAttachmentData;
  operations: DashboardOperation[];
  logger: Logger;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: VisualizationFailure[] };
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}

const createEmptyDashboardData = (): DashboardAttachmentData => ({
  title: 'User Dashboard',
  description: undefined,
  panels: [],
});

export const executeDashboardOperations = async ({
  dashboardData,
  operations,
  logger,
  resolvePanelsFromAttachments,
  resolveVisualizationConfig,
}: ExecuteDashboardOperationsParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: VisualizationFailure[];
}> => {
  let nextDashboardData = structuredClone(dashboardData ?? createEmptyDashboardData());
  const failures: VisualizationFailure[] = [];
  const visualizationCreationRequests = collectVisualizationCreationRequests(operations);
  const resolvedVisualizationCreationRequests = await resolveVisualizationCreationRequests({
    requestsByOperationIndex: visualizationCreationRequests,
    resolveVisualizationConfig,
  });
  const context: OperationExecutionContext = {
    logger,
    failures,
    resolvedVisualizationCreationRequests,
    resolvePanelsFromAttachments,
    resolveVisualizationConfig,
  };

  for (const [operationIndex, operation] of operations.entries()) {
    nextDashboardData = await executeOperationHandler({
      dashboardData: nextDashboardData,
      operation,
      operationIndex,
      context,
    });
  }

  return {
    dashboardData: nextDashboardData,
    failures,
  };
};
