/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { ConversationRoundAuthor } from '@kbn/agent-builder-common';
import type { AttachmentBoundedTool, AttachmentRepresentation } from './attachments';

/**
 * Server-side processed attachment: attachment plus its representation and tools.
 */
export interface ProcessedAttachment {
  attachment: Attachment;
  representation: AttachmentRepresentation;
  tools: AttachmentBoundedTool[];
}

/**
 * Server-side processed attachment type, it's type and description needed for instructions.
 */
export interface ProcessedAttachmentType {
  type: string;
  description?: string;
}

/**
 * Server-side processed attachment reference
 */
export interface ProcessedAttachmentVersionRef extends AttachmentVersionRef {
  /** Type added to track instructions */
  type?: string;
}

/**
 * Image payload to emit as a multimodal HumanMessage content part for a round.
 */
export interface ProcessedImagePart {
  /** Attachment id (for debugging / stubs) */
  attachmentId: string;
  /** MIME type of the image */
  mediaType: string;
  /** Raw base64-encoded image bytes (no `data:` prefix) */
  data: string;
}

/**
 * Processed input for a single conversation round (message + processed attachments).
 */
export interface ProcessedRoundInput {
  message: string;
  attachments: ProcessedAttachment[];
  /** References to versioned conversation-level attachments touched during this round. */
  attachment_refs?: ProcessedAttachmentVersionRef[];
  /** Pre-rendered, immutable attachment prompt context for this round (see RoundInput). */
  attachment_context?: string;
  /** Author attributed to this input */
  author?: ConversationRoundAuthor;
  /**
   * Image attachments for this round, inlined into the HumanMessage as multimodal content.
   * Produced in prepareRoundInput from attachmentStateManager.
   */
  image_parts?: ProcessedImagePart[];
}
