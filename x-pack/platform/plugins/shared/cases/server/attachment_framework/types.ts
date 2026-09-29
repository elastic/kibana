/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';
import type { z } from '@kbn/zod/v4';
import type {
  UnifiedAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../../common/types/domain/attachment/v2';
import type { AttachmentAttributesV2 } from '../../common/types/domain';

/**
 * Unified attachment state for server-side persistence
 * Can be either reference-based (has attachmentId) or value-based (has data)
 */
export type UnifiedAttachmentState = Pick<UnifiedAttachmentPayload, 'type' | 'metadata'> &
  (
    | Pick<UnifiedReferenceAttachmentPayload, 'attachmentId'>
    | Pick<UnifiedValueAttachmentPayload, 'data'>
  );

export interface WorkflowAttachmentTarget {
  id: string;
  index?: string;
}

export interface WorkflowAttachmentResolverContext {
  attachment: UnifiedAttachmentState;
  savedObjectId: string;
}

export interface WorkflowAttachmentValidationContext {
  targets: readonly WorkflowAttachmentTarget[];
  inputs: Record<string, unknown>;
}

/** Enables an attachment type as a workflow origin with optional target resolution and validation. */
export interface AttachmentWorkflowDefinition {
  /**
   * Resolves the attachment targets that may be named by a workflow origin.
   * Reference attachments default to their `attachmentId`; value attachments default to
   * their Cases attachment saved-object id.
   */
  getTargets?: (context: WorkflowAttachmentResolverContext) => readonly WorkflowAttachmentTarget[];
  /** Applies attachment-specific input/target alignment after Cases membership checks. */
  validateTargets?: (context: WorkflowAttachmentValidationContext) => void;
}

export interface AttachmentDeleteTarget {
  /** The attachment saved object id. */
  id: string;
  attributes: AttachmentAttributesV2;
}

export interface AttachmentDeleteContext {
  caseId: string;
  request: KibanaRequest;
  /** The attachments of this type being deleted. */
  attachments: readonly AttachmentDeleteTarget[];
  /** The case's attachments that are not being deleted. */
  remainingAttachments: readonly AttachmentDeleteTarget[];
}

export interface AttachmentDeleteResult {
  /** Ids from `remainingAttachments` to delete in the same operation. */
  relatedAttachmentIds: readonly string[];
}

/**
 * Called before attachments of the type are deleted, whatever the caller (UI, API, agent or
 * workflow), so a type can take attachments it depends on with it. Related attachments go through
 * the same authorization, user actions and alert sync as the requested ones; their own `onDelete`
 * is not called.
 */
export type AttachmentOnDelete = (
  context: AttachmentDeleteContext
) => Promise<AttachmentDeleteResult>;

export interface UnifiedAttachmentType
  extends Omit<PersistableState<UnifiedAttachmentState>, 'migrations' | 'inject' | 'extract'> {
  id: string;
  /** Full-payload zod schema. Sole validation source for unified attachments. */
  schema: z.ZodType;
  /**
   * Schema exposed to workflow authors. When unset, workflow steps fall back to
   * `schema` if it is a Zod object; when `false`, the type is excluded.
   */
  workflowSchema?: z.ZodObject | false;
  workflow?: AttachmentWorkflowDefinition;
  onDelete?: AttachmentOnDelete;
}

export interface UnifiedAttachmentTypeSetup
  extends Omit<
    PersistableStateDefinition<UnifiedAttachmentState>,
    'migrations' | 'inject' | 'extract'
  > {
  id: string;
  /** Full-payload zod schema. Sole validation source for unified attachments. */
  schema: z.ZodType;
  workflowSchema?: z.ZodObject | false;
  workflow?: AttachmentWorkflowDefinition;
  onDelete?: AttachmentOnDelete;
}

export interface AttachmentFramework {
  registerAttachment: (attachmentType: UnifiedAttachmentTypeSetup) => void;
}
