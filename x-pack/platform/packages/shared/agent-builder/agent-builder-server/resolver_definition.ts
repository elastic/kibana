/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverTypeDefinition as ResolverTypeDefinitionBase } from '@kbn/agent-context-layer-common';
import type { AttachmentBoundedTool } from './attachments/tools';

/**
 * Attachment resolver type as consumed by the Agent Builder runner (bounded tools fully typed).
 */
export type ResolverTypeDefinition<
  TType extends string = string,
  TContent = unknown
> = ResolverTypeDefinitionBase<TType, TContent, AttachmentBoundedTool>;
