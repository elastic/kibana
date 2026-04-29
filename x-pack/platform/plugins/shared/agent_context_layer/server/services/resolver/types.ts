/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentBoundedTool } from '@kbn/agent-builder-server/attachments/tools';
import type { ResolverTypeDefinition as ResolverTypeDefinitionBase } from '@kbn/agent-context-layer-common';

export type {
  ResolverValidationResult,
  ResolverFormatContext,
  ResolverResolveContext,
  ResolverRepresentation,
  ResolverBoundedToolItemSnapshot,
  ResolverStaleCheckItem,
} from '@kbn/agent-context-layer-common';

/**
 * Instance-scoped bounded tools for resolver types (alias of `AttachmentBoundedTool`).
 */
export type ResolverBoundedToolDefinition = AttachmentBoundedTool;

/**
 * Resolver / attachment type definition for registration on agent context layer.
 */
export type ResolverTypeDefinition<
  TType extends string = string,
  TContent = unknown
> = ResolverTypeDefinitionBase<TType, TContent, AttachmentBoundedTool>;
