/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * List of internal / built-in attachment types.
 *
 * The list is not fixed, as contributors can add their own attachment types.
 */
export enum AttachmentType {
  screenContext = 'screen_context',
  text = 'text',
  esql = 'esql',
  connector = 'connector',
  uploadedFile = 'uploaded_file',
}

interface AttachmentDataMap {
  [AttachmentType.esql]: EsqlAttachmentData;
  [AttachmentType.text]: TextAttachmentData;
  [AttachmentType.screenContext]: ScreenContextAttachmentData;
  [AttachmentType.connector]: ConnectorAttachmentData;
  [AttachmentType.uploadedFile]: UploadedFileAttachmentData;
}

export const esqlAttachmentDataSchema = z.object({
  query: z.string(),
  description: z.string().optional(),
});

/**
 * Data for an esql attachment.
 */
export interface EsqlAttachmentData {
  /** the esql query */
  query: string;
  /** optional description of the query */
  description?: string;
}

export const textAttachmentDataSchema = z.object({
  content: z.string(),
});

/**
 * Data for a text attachment.
 */
export interface TextAttachmentData {
  /** text content of the attachment */
  content: string;
}

export const screenContextTimeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export interface TimeRange {
  from: string;
  to: string;
}

export const screenContextAttachmentDataSchema = z
  .object({
    url: z.string().optional(),
    app: z.string().optional(),
    description: z.string().optional(),
    time_range: screenContextTimeRangeSchema.optional(),
    additional_data: z.record(z.string(), z.string()).optional(),
  })
  .check((ctx) => {
    // at least one of the fields must be present
    const data = ctx.value;
    if (!data.url && !data.app && !data.description && !data.additional_data) {
      ctx.issues.push({
        code: 'custom',
        message: 'At least one of url, app, description, or additional_data must be present',
        input: data,
      });
    }
  });

/**
 * Data for a screen context attachment.
 */
export interface ScreenContextAttachmentData {
  /** current url */
  url?: string;
  /** kibana app name */
  app?: string;
  /** app description */
  description?: string;
  /** the currently active time range */
  time_range?: TimeRange;
  /** arbitrary additional context data */
  additional_data?: Record<string, string>;
}

/**
 * Tag prefix used to associate tools with their parent connector instance.
 * A tool tagged `connector:<connectorId>` belongs to that connector.
 */
export const CONNECTOR_TAG_PREFIX = 'connector:';

export const connectorAttachmentDataSchema = z.object({
  connector_id: z.string(),
  connector_name: z.string(),
  connector_type: z.string(),
});

/**
 * Data for a connector attachment.
 */
export interface ConnectorAttachmentData {
  /** The saved connector instance ID */
  connector_id: string;
  /** Human-readable connector name */
  connector_name: string;
  /** Action type ID (e.g., ".slack2", ".mcp") */
  connector_type: string;
}

export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];

/**
 * MIME types accepted for `uploaded_file` attachments. The platform upload
 * route and the `uploaded_file` attachment type both validate against this
 * list. Raw bytes of any other type are rejected before they reach storage.
 */
export const ACCEPTED_UPLOAD_MIME_TYPES = ['application/json', 'application/x-ndjson'] as const;

/**
 * File extensions accepted for `uploaded_file` attachments (lower-cased,
 * without the leading dot). Used as a fallback when the MIME type is not
 * supplied or generic.
 */
export const ACCEPTED_UPLOAD_EXTENSIONS = ['json', 'ndjson'] as const;

export const isAcceptedUploadMime = (mime: string): boolean =>
  (ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());

export const isAcceptedUploadExtension = (filename: string): boolean => {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = filename.slice(dot + 1).toLowerCase();
  return (ACCEPTED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext);
};

export const uploadedFileAttachmentDataSchema = z.object({
  /** Original file name as provided by the user. */
  name: z.string().max(256),
  /** MIME type, validated against an accept-list by the platform attachment type. */
  mime: z.string().max(128),
  /** File size in bytes. */
  size: z.number().nonnegative(),
  /**
   * Path of the raw bytes within the per-run filestore attachments volume
   * (e.g. `/attachments/<attachment_id>`). The platform owns the bytes; only
   * metadata is exposed to the LLM.
   */
  fsPath: z.string().max(512),
});

/**
 * Data for an `uploaded_file` attachment.
 *
 * The raw file content is never stored in the attachment `data` and never
 * reaches the LLM. `fsPath` is the address of the bytes inside the filestore
 * attachments volume; tools that need the content read it server-side via
 * `AttachmentStateManager.readContent`.
 */
export interface UploadedFileAttachmentData {
  /** Original file name as provided by the user. */
  name: string;
  /** MIME type, validated against an accept-list by the platform attachment type. */
  mime: string;
  /** File size in bytes. */
  size: number;
  /**
   * Path of the raw bytes within the per-run filestore attachments volume
   * (e.g. `/attachments/<attachment_id>`).
   */
  fsPath: string;
}
