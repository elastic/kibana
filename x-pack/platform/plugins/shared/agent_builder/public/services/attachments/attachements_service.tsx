/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  UnknownAttachment,
  UpdateOriginResponse,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { publicApiPath } from '../../../common/constants';

/**
 * Internal service for managing attachment UI definitions and API operations.
 * This service maintains a registry of UI definitions for different attachment types
 * and provides methods for attachment API operations.
 */
export class AttachmentsService {
  private readonly registry: Map<string, AttachmentUIDefinition> = new Map();
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

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

  /**
   * Updates the origin reference for an attachment.
   * Use this after saving a by-value attachment to link it to its persistent store.
   *
   * @param conversationId - The conversation containing the attachment
   * @param attachmentId - The ID of the attachment to update
   * @param origin - The origin reference object (shape depends on attachment type)
   */
  async updateOrigin(
    conversationId: string,
    attachmentId: string,
    origin: unknown
  ): Promise<UpdateOriginResponse> {
    return await this.http.put<UpdateOriginResponse>(
      `${publicApiPath}/conversations/${conversationId}/attachments/${attachmentId}/origin`,
      {
        body: JSON.stringify({ origin }),
      }
    );
  }
}
