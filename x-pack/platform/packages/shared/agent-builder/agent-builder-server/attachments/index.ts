/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AttachmentTypeDefinition,
  AttachmentFindQuery,
  AttachmentFindResult,
  AttachmentRepresentation,
  TextAttachmentRepresentation,
  AttachmentValidationResult,
  AgentFormattedAttachment,
  AttachmentFormatContext,
  AttachmentResolveContext,
} from './type_definition';
export type {
  SmlAttachmentChunk,
  SmlAttachmentData,
  SmlAttachmentDataContext,
  SmlAttachmentFromIdContext,
  SmlAttachmentListContext,
  SmlAttachmentListItem,
  SmlAttachmentPermissions,
  SmlAttachmentSearchItem,
  SmlAttachmentToAttachmentContext,
  SmlAttachmentTypeDefinition,
  SmlUpdateAction,
} from './sml';
export type {
  AttachmentBoundedTool,
  BuiltinAttachmentBoundedTool,
  IndexSearchAttachmentBoundedTool,
  WorkflowAttachmentBoundedTool,
  StaticEsqlAttachmentBoundedTool,
} from './tools';
export type {
  AttachmentStateManager,
  AttachmentUpdateInput,
  ResolvedAttachmentRef,
} from './attachment_state_manager';
export { createAttachmentStateManager } from './attachment_state_manager';
