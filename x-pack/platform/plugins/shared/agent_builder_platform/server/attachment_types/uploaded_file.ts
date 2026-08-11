/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UploadedFileAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  uploadedFileAttachmentDataSchema,
  isAcceptedUploadMime,
  isAcceptedUploadExtension,
} from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentTypeDefinition,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import type { AttachmentsStorageContract } from '@kbn/agent-builder-server';

/**
 * Origin shape used by the platform upload route: `<workspaceId>/<attachmentId>`.
 * The `uploaded_file` attachment is created by-reference, so `resolve` receives
 * this string and uses it to read the sidecar metadata from workspace storage.
 */
const parseOrigin = (origin: string): { workspaceId: string; attachmentId: string } => {
  const sep = origin.indexOf('/');
  if (sep <= 0 || sep === origin.length - 1) {
    throw new Error(
      `Invalid uploaded_file origin "${origin}": expected "<workspaceId>/<attachmentId>"`
    );
  }
  return { workspaceId: origin.slice(0, sep), attachmentId: origin.slice(sep + 1) };
};

export interface CreateUploadedFileAttachmentTypeDeps {
  /**
   * Async factory (from {@link AgentBuilderPluginSetup.createAttachmentsStorage})
   * that returns a request-scoped attachments storage. Called lazily inside
   * `resolve` with the request and spaceId from the resolve context, so the
   * storage is scoped to the resolving request.
   */
  createAttachmentsStorage: (opts: {
    request: KibanaRequest;
    spaceId: string;
  }) => Promise<AttachmentsStorageContract>;
}

/**
 * Creates the `uploaded_file` attachment type definition.
 *
 * By-reference only: the platform upload route stores raw bytes in workspace
 * storage under `/attachments/<id>` and creates the attachment with
 * `origin = "<workspaceId>/<attachmentId>"`. `resolve` reads the sidecar
 * metadata (name, mime, size) from workspace storage, validates the mime type
 * and file extension against a fixed accept-list, and returns the metadata
 * only — the raw content is never parsed or inlined. Tools that need the
 * content read it server-side via `AttachmentStateManager.readContent`.
 */
export const createUploadedFileAttachmentType = (
  deps: CreateUploadedFileAttachmentTypeDeps
): AttachmentTypeDefinition<AttachmentType.uploadedFile, UploadedFileAttachmentData> => {
  return {
    id: AttachmentType.uploadedFile,

    isReadonly: true,

    maxContentLength: 500,

    validate: (input) => {
      const parseResult = uploadedFileAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },

    resolve: async (origin, context: AttachmentResolveContext) => {
      const { workspaceId, attachmentId } = parseOrigin(origin);
      const storage = await deps.createAttachmentsStorage({
        request: context.request,
        spaceId: context.spaceId,
      });
      const meta = await storage.readMeta(workspaceId, attachmentId);
      if (!meta) {
        throw new Error(
          `uploaded_file resolve failed: no metadata for attachment "${attachmentId}" in workspace "${workspaceId}"`
        );
      }
      const mime = meta.mime.toLowerCase();
      if (!isAcceptedUploadMime(mime) && !isAcceptedUploadExtension(meta.name)) {
        throw new Error(
          `uploaded_file resolve failed: unsupported file type "${mime || meta.name}" for "${
            meta.name
          }". Accepted: JSON, NDJSON, CSV, text/plain.`
        );
      }
      const data: UploadedFileAttachmentData = {
        name: meta.name,
        mime,
        size: meta.size,
        fsPath: `/attachments/${attachmentId}`,
      };
      return data;
    },

    format: (attachment) => {
      const { name, mime, size } = attachment.data;
      return {
        getRepresentation: () => ({
          type: 'text',
          value: `File attachment: ${name} (${mime}, ${size} bytes). Content is not inlined; use a skill tool to process it.`,
        }),
      };
    },

    getAgentDescription: () =>
      'A file uploaded by the user. Only metadata is exposed; use a skill tool to process it.',

    getTools: () => [],
  };
};
