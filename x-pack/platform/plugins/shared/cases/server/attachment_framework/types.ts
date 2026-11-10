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

export interface RelatedAttachmentsContext {
  caseId: string;
  request: KibanaRequest;
  /** The attachments of this type being deleted. */
  attachments: readonly AttachmentDeleteTarget[];
  /** The case's attachments of the declared `readTypes` that are not being deleted. */
  remainingAttachments: readonly AttachmentDeleteTarget[];
}

/** Ids of one attachment type, as the bulk delete by attachment ids takes them. */
export interface RelatedAttachmentIds {
  type: string;
  attachmentIds: string[];
}

/**
 * Called after the attachments of the type are authorized for deletion and before they are
 * deleted, whatever the caller (UI, API, agent or workflow), so a type can take attachments it
 * depends on with it. The returned ids must be attached to the case outside the deleted
 * attachments; they are removed like a bulk delete by attachment ids, with the same
 * authorization, user actions and alert sync, and without calling their own type's hook.
 */
export type GetRelatedAttachments = (
  context: RelatedAttachmentsContext
) => Promise<RelatedAttachmentIds[]>;

export interface RelatedAttachmentsDefinition {
  /** The attachment types `get` reads from the case; only those are loaded for it. */
  readTypes: readonly string[];
  get: GetRelatedAttachments;
}

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
  relatedAttachments?: RelatedAttachmentsDefinition;
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
  relatedAttachments?: RelatedAttachmentsDefinition;
}

export interface AttachmentFramework {
  registerAttachment: (attachmentType: UnifiedAttachmentTypeSetup) => void;
}
