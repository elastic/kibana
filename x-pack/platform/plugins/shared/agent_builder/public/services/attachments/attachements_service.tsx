/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';

/**
 * Internal service for managing attachment UI definitions.
 * This service maintains a registry of UI definitions for different attachment types.
 */
export class AttachmentsService {
  private readonly registry: Map<string, AttachmentUIDefinition> = new Map();

  /**
   * Registers a UI definition for a specific attachment type.
   *
   * @param attachmentType - The unique identifier for the attachment type
   * @param definition - The UI definition for rendering this attachment type
   * @throws Error if the attachment type is already registered
   */
  addAttachmentType<TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string,
    definition: AttachmentUIDefinition<TAttachment>
  ): void {
    if (this.registry.has(attachmentType)) {
      throw new Error(`Attachment type "${attachmentType}" is already registered.`);
    }
    this.registry.set(attachmentType, definition as AttachmentUIDefinition);
  }

  /**
   * Retrieves the UI definition for a specific attachment type.
   *
   * @param attachmentType - The type identifier to look up
   * @returns The UI definition if registered, undefined otherwise
   */
  getAttachmentUiDefinition<TAttachment extends UnknownAttachment = UnknownAttachment>(
    attachmentType: string
  ): AttachmentUIDefinition<TAttachment> | undefined {
    return this.registry.get(attachmentType) as AttachmentUIDefinition<TAttachment> | undefined;
  }

  /**
   * Checks if a UI definition is registered for the given attachment type.
   *
   * @param attachmentType - The type identifier to check
   * @returns true if a definition is registered, false otherwise
   */
  hasAttachmentType(attachmentType: string): boolean {
    return this.registry.has(attachmentType);
  }
}
