/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type {
  ResolverFormatContext,
  ResolverRepresentation,
  ResolverResolveContext,
  ResolverValidationResult,
} from '@kbn/agent-context-layer-common';
import type { AttachmentBoundedTool } from './tools';

/** @deprecated Use {@link ResolverRepresentation} from `@kbn/agent-context-layer-common`. */
export type AttachmentRepresentation = ResolverRepresentation;

/**
 * Text representation of an attachment when exposed to the LLM.
 * @deprecated Use {@link ResolverRepresentation}.
 */
export interface TextAttachmentRepresentation {
  type: 'text';
  value: string;
}

/** @deprecated Use {@link ResolverValidationResult} from `@kbn/agent-context-layer-common`. */
export type AttachmentValidationResult<TValidatedData = unknown> =
  ResolverValidationResult<TValidatedData>;

/** @deprecated Use {@link ResolverFormatContext} from `@kbn/agent-context-layer-common`. */
export type AttachmentFormatContext = ResolverFormatContext;

/** @deprecated Use {@link ResolverResolveContext} from `@kbn/agent-context-layer-common`. */
export type AttachmentResolveContext = ResolverResolveContext;

/**
 * @deprecated Prefer returning {@link ResolverRepresentation} directly from `format`.
 */
export interface AgentFormattedAttachment {
  getRepresentation?: () => MaybePromise<AttachmentRepresentation>;
  getBoundedTools?: () => MaybePromise<AttachmentBoundedTool[]>;
}

export type {
  AttachmentBoundedTool,
  BuiltinAttachmentBoundedTool,
  IndexSearchAttachmentBoundedTool,
  StaticEsqlAttachmentBoundedTool,
  WorkflowAttachmentBoundedTool,
} from './tools';
