/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentFormatContext,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';

/**
 * Options for creating attachment tools with a specific state manager.
 */
export interface AttachmentToolsOptions {
  /** The attachment state manager to operate on */
  attachmentManager: AttachmentStateManager;
  /** Attachment type definitions for formatting (optional) */
  attachmentsService?: AttachmentsService;
  /** Context used when formatting attachments */
  formatContext?: AttachmentFormatContext;
}
