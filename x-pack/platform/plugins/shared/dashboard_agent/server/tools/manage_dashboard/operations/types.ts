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
import type { VisualizationFailure } from '../utils';
import type { ResolvedVisualizationCreationRequest } from './visualization_creation';

export interface OperationExecutionContext {
  logger: Logger;
  failures: VisualizationFailure[];
  resolvedVisualizationCreationRequests: Map<number, ResolvedVisualizationCreationRequest[]>;
  resolvePanelsFromAttachments: (
    attachmentInputs: Array<{ attachmentId: string; grid: AttachmentPanel['grid'] }>
  ) => { panels: AttachmentPanel[]; failures: VisualizationFailure[] };
  resolveVisualizationConfig?: ResolveVisualizationConfig;
}

export interface OperationHandlerParams<TOperation> {
  dashboardData: DashboardAttachmentData;
  operation: TOperation;
  operationIndex: number;
  context: OperationExecutionContext;
}

type OperationHandler<TOperation> = (
  params: OperationHandlerParams<TOperation>
) => DashboardAttachmentData | Promise<DashboardAttachmentData>;

type OperationSchema = z.ZodObject<{ operation: z.ZodLiteral<string> }>;

export interface OperationDefinition<
  TSchema extends OperationSchema,
  TOperation = z.infer<TSchema>
> {
  schema: TSchema;
  handler: OperationHandler<TOperation>;
}

export const defineOperation = <TSchema extends OperationSchema>(
  definition: OperationDefinition<TSchema>
): OperationDefinition<TSchema, unknown> => ({
  schema: definition.schema,
  handler: ({ operation, ...params }) =>
    definition.handler({
      ...params,
      operation: definition.schema.parse(operation),
    }),
});
