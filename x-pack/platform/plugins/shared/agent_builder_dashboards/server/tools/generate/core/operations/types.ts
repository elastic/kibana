/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ResolvedCustomContentTemplate } from '@kbn/custom-content-server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { z } from '@kbn/zod/v4';
import type { ResolvePanelContent } from './panels';
import type { PanelFailure } from '../utils';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { ResolvedPanelCreationRequest } from './panel_creation';

export type ResolveCustomContentTemplate = (params: {
  prompt: string;
  esqlQuery?: string;
  existingTemplate?: string;
  /** True when the panel already has an ES|QL query that is not changing, so the resolver can skip re-sampling. */
  hasExistingQuery?: boolean;
}) => Promise<ResolvedCustomContentTemplate>;

/**
 * Turns a visualization attachment id into panel content. Injected like the other
 * resolvers so the generate core stays free of store access — the tool wrapper owns
 * the attachment read. Synchronous because reading the conversation's attachment
 * state is an in-memory lookup, unlike the model-backed resolvers above.
 */
export type ResolveAttachmentPanel = (attachmentId: string) => PanelContentAttempt;

export interface OperationExecutionContext {
  logger: Logger;
  failures: PanelFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
  resolvedPanelCreationRequests: Map<number, ResolvedPanelCreationRequest[]>;
  resolvePanelContent?: ResolvePanelContent;
  resolveCustomContentTemplate?: ResolveCustomContentTemplate;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
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
