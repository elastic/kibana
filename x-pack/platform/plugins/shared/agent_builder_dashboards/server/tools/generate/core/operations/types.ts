/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { z } from '@kbn/zod/v4';
import type { ResolvePanelContent } from './panels';
import type { PanelFailure } from '../utils';
import type { ResolvedPanelCreationRequest } from './panel_creation';

export interface OperationExecutionContext {
  logger: Logger;
  failures: PanelFailure[];
  resolvedPanelCreationRequests: Map<number, ResolvedPanelCreationRequest[]>;
  resolvePanelContent?: ResolvePanelContent;
  /**
   * Caller-chosen temporary keys (`ref`) declared by `add_section` operations in
   * this call, mapped to the minted section ids. Later operations resolve their
   * `sectionId` through this map first, so a single call can compose a new
   * section and its contents. Scoped to one tool call.
   */
  sectionRefs: Map<string, string>;
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

/**
 * Pairs an operation schema with its handler. The handler body is type-checked
 * against `z.infer<TSchema>`; at dispatch time the operation has already been
 * parsed against the discriminated union (see `registry.ts`), so it is passed
 * through to the matching handler without re-parsing.
 */
export const defineOperation = <TSchema extends OperationSchema>(
  definition: OperationDefinition<TSchema>
): OperationDefinition<TSchema, unknown> => definition as OperationDefinition<TSchema, unknown>;
