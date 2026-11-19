/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type {
  UnknownAttachment,
  UpdateOriginResponse,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentUIDefinition,
  CreateAttachmentArgs,
  DeleteAttachmentArgs,
  GetAttachmentArgs,
  ListAttachmentsArgs,
  ListAttachmentsResult,
  UpdateAttachmentArgs,
} from '@kbn/agent-builder-browser';
import { publicApiPath } from '../../../common/constants';
import type {
  CheckStaleAttachmentsResponse,
  CreateAttachmentResponse,
  DeleteAttachmentResponse,
  GetAttachmentResponse,
  ListAttachmentsResponse,
  UpdateAttachmentResponse,
} from '../../../common/http_api/attachments';

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
    origin: string
  ): Promise<UpdateOriginResponse> {
    return await this.http.put<UpdateOriginResponse>(
      buildPath(
        `${publicApiPath}/conversations/{conversationId}/attachments/{attachmentId}/origin`,
        { conversationId, attachmentId }
      ),
      { body: JSON.stringify({ origin }) }
    );
  }

  /**
   * Checks all conversation attachments for staleness against their origin snapshots.
   */
  async checkStale(conversationId: string): Promise<CheckStaleAttachmentsResponse> {
    return await this.http.get<CheckStaleAttachmentsResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments/stale`, {
        conversationId,
      })
    );
  }

  async list({
    conversationId,
    includeDeleted,
  }: ListAttachmentsArgs): Promise<ListAttachmentsResult> {
    return await this.http.get<ListAttachmentsResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments`, {
        conversationId,
      }),
      { query: { include_deleted: includeDeleted } }
    );
  }

  async get({ conversationId, attachmentId }: GetAttachmentArgs): Promise<VersionedAttachment> {
    const { attachment } = await this.http.get<GetAttachmentResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments/{attachmentId}`, {
        conversationId,
        attachmentId,
      })
    );
    return attachment;
  }

  async create({ conversationId, ...body }: CreateAttachmentArgs): Promise<VersionedAttachment> {
    const { attachment } = await this.http.post<CreateAttachmentResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments`, {
        conversationId,
      }),
      { body: JSON.stringify(body) }
    );
    return attachment;
  }

  async update({
    conversationId,
    attachmentId,
    ...body
  }: UpdateAttachmentArgs): Promise<VersionedAttachment> {
    const { attachment } = await this.http.put<UpdateAttachmentResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments/{attachmentId}`, {
        conversationId,
        attachmentId,
      }),
      { body: JSON.stringify(body) }
    );
    return attachment;
  }

  async delete({ conversationId, attachmentId, permanent }: DeleteAttachmentArgs): Promise<void> {
    await this.http.delete<DeleteAttachmentResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}/attachments/{attachmentId}`, {
        conversationId,
        attachmentId,
      }),
      { query: { permanent } }
    );
  }
}
