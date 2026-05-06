/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { ResolveVisualizationConfig } from '../inline_visualization';
import type { DashboardOperation } from '../operations';
import type { VisualizationFailure } from '../utils';
import type { ResolvedVisualizationCreationRequest } from './visualization_creation';

export type DashboardOperationType = DashboardOperation['operation'];
export type DashboardOperationByType<T extends DashboardOperationType> = Extract<
  DashboardOperation,
  { operation: T }
>;

export interface OperationExecutionContext {
  logger: Logger;
  failures: VisualizationFailure[];
  resolvedVisualizationCreationRequests: Map<number, ResolvedVisualizationCreationRequest[]>;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: VisualizationFailure[] };
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}

export interface OperationHandlerParams<T extends DashboardOperationType> {
  dashboardData: DashboardAttachmentData;
  operation: DashboardOperationByType<T>;
  operationIndex: number;
  context: OperationExecutionContext;
}

export type OperationHandler<T extends DashboardOperationType> = (
  params: OperationHandlerParams<T>
) => DashboardAttachmentData | Promise<DashboardAttachmentData>;

export type OperationHandlerMap = {
  [T in DashboardOperationType]: OperationHandler<T>;
};
