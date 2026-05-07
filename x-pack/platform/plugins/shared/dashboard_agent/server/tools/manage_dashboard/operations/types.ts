/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { z } from '@kbn/zod/v4';
import type { ResolveVisualizationConfig } from '../inline_visualization';
import type { PanelResolutionFailure, VisualizationFailure } from '../utils';
import type {
  ResolvedVisualizationCreationRequest,
  VisualizationCreationRequest,
} from './visualization_creation';

export interface OperationExecutionContext {
  logger: Logger;
  failures: VisualizationFailure[];
  resolvedVisualizationCreationRequests: Map<number, ResolvedVisualizationCreationRequest[]>;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: PanelResolutionFailure[] };
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}

export interface OperationHandlerParams<TOperation> {
  dashboardData: DashboardAttachmentData;
  operation: TOperation;
  operationIndex: number;
  context: OperationExecutionContext;
}

export type OperationHandler<TOperation> = (
  params: OperationHandlerParams<TOperation>
) => DashboardAttachmentData | Promise<DashboardAttachmentData>;

type OperationSchema = z.ZodObject<{ operation: z.ZodLiteral<string> }>;

export interface OperationDefinition<TSchema extends OperationSchema> {
  schema: TSchema;
  handler: OperationHandler<z.infer<TSchema>>;
  collectVisualizationCreationRequests?: (
    operation: z.infer<TSchema>
  ) => VisualizationCreationRequest[];
}

export const defineOperation = <TSchema extends OperationSchema>(
  definition: OperationDefinition<TSchema>
) => definition;
