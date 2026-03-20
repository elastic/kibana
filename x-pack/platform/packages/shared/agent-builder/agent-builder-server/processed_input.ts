/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
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
 * Processed input for a single conversation round (message + processed attachments).
 */
export interface ProcessedRoundInput {
  message: string;
  attachments: ProcessedAttachment[];
}
