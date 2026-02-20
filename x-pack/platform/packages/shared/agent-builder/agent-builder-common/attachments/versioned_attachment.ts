/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentType, AttachmentDataOf } from './attachment_types';

/**
 * Represents a single version of an attachment's content.
 */
export interface AttachmentVersion<DataType = unknown> {
  /** Version number (starts at 1) */
  version: number;
  /** The attachment data for this version */
  data: DataType;
  /** When this version was created */
  created_at: string;
  /** Hash of the content for deduplication */
  content_hash: string;
  /** Estimated token count for LLM context management */
  estimated_tokens?: number;
}

/**
 * Represents a conversation-level versioned attachment.
 * Contains all versions of the attachment and metadata.
 */
export interface VersionedAttachment<
  Type extends string = string,
  DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown
> {
  /** Unique identifier for the attachment */
  id: string;
  /** Type of the attachment */
  type: Type;
  /** Array of all versions (ordered by version number) */
  versions: AttachmentVersion<DataType>[];
  /** Current active version number */
  current_version: number;
  /** Human-readable description of the attachment */
  description?: string;
  /** Status of the attachment */
  active?: boolean;
  /** Whether the attachment should be hidden from the user */
  hidden?: boolean;
  /** Whether the attachment is read-only in this conversation */
  readonly?: boolean;
  /** The client-provided ID if this attachment was created with one (e.g., via flyout configuration) */
  client_id?: string;
  /**
   * Origin/reference info for attachments created from external sources (e.g., saved objects).
   * Undefined for by-value attachments.
   */
  origin?: unknown;
}

/**
 * Operation performed on an attachment during a round.
 */
export const ATTACHMENT_REF_OPERATION = {
  read: 'read',
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  restored: 'restored',
} as const;

export type AttachmentRefOperation =
  (typeof ATTACHMENT_REF_OPERATION)[keyof typeof ATTACHMENT_REF_OPERATION];

export const ATTACHMENT_REF_ACTOR = {
  user: 'user',
  agent: 'agent',
  system: 'system',
} as const;

export type AttachmentRefActor = (typeof ATTACHMENT_REF_ACTOR)[keyof typeof ATTACHMENT_REF_ACTOR];

/**
 * Reference to a specific version of an attachment.
 * Used in RoundInput to reference conversation-level attachments.
 */
export interface AttachmentVersionRef {
  /** ID of the attachment being referenced */
  attachment_id: string;
  /** Version number being referenced */
  version: number;
  /** Operation performed on this attachment during the round */
  operation?: AttachmentRefOperation;
  /** Actor responsible for the operation during the round */
  actor?: AttachmentRefActor;
}

/**
 * Represents a diff between two versions of an attachment.
 */
export interface AttachmentDiff {
  /** Type of change between versions */
  change_type: 'create' | 'update' | 'delete' | 'restore';
  /** Human-readable summary of the change */
  summary: string;
  /** List of fields that changed (for updates) */
  changed_fields?: string[];
}

/**
 * Input for creating a new versioned attachment.
 */
export interface VersionedAttachmentInput<
  Type extends string = string,
  DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown
> {
  /** Optional ID (will be generated if not provided) */
  id?: string;
  /** Type of the attachment */
  type: Type;
  /** The attachment data. Optional when `origin` is provided (content will be resolved). */
  data?: DataType;
  /** Origin/reference info for by-reference attachments (e.g., saved object ID). */
  origin?: unknown;
  /** Human-readable description */
  description?: string;
  /** Whether the attachment should be hidden */
  hidden?: boolean;
  /** Whether the attachment should be read-only */
  readonly?: boolean;
}

// Zod schemas for validation

export const attachmentRefOperationSchema = z.enum([
  ATTACHMENT_REF_OPERATION.read,
  ATTACHMENT_REF_OPERATION.created,
  ATTACHMENT_REF_OPERATION.updated,
  ATTACHMENT_REF_OPERATION.deleted,
  ATTACHMENT_REF_OPERATION.restored,
]);

export const attachmentRefActorSchema = z.enum([
  ATTACHMENT_REF_ACTOR.user,
  ATTACHMENT_REF_ACTOR.agent,
  ATTACHMENT_REF_ACTOR.system,
]);

export const attachmentVersionRefSchema = z.object({
  attachment_id: z.string(),
  version: z.number().int().positive(),
  operation: attachmentRefOperationSchema.optional(),
  actor: attachmentRefActorSchema.optional(),
});

export const attachmentVersionSchema = z.object({
  version: z.number().int().positive(),
  data: z.unknown(),
  created_at: z.string(),
  content_hash: z.string(),
  estimated_tokens: z.number().int().optional(),
});

export const versionedAttachmentSchema = z.object({
  id: z.string(),
  type: z.string(),
  versions: z.array(attachmentVersionSchema),
  current_version: z.number().int().positive(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  hidden: z.boolean().optional(),
  readonly: z.boolean().optional(),
  client_id: z.string().optional(),
  origin: z.unknown().optional(),
});

export const versionedAttachmentInputSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.unknown().optional(),
  origin: z.unknown().optional(),
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  readonly: z.boolean().optional(),
});

export const attachmentDiffSchema = z.object({
  change_type: z.enum(['create', 'update', 'delete', 'restore']),
  summary: z.string(),
  changed_fields: z.array(z.string()).optional(),
});

// Utility functions

/**
 * Gets the latest (current) version of an attachment.
 */
export const getLatestVersion = <T = unknown>(
  attachment: VersionedAttachment<string, T>
): AttachmentVersion<T> | undefined => {
  return attachment.versions.find((v) => v.version === attachment.current_version);
};

/**
 * Gets a specific version of an attachment.
 */
export const getVersion = <T = unknown>(
  attachment: VersionedAttachment<string, T>,
  version: number
): AttachmentVersion<T> | undefined => {
  return attachment.versions.find((v) => v.version === version);
};

/**
 * Creates a unique identifier for a specific attachment version.
 */
export const createVersionId = (attachmentId: string, version: number): string => {
  return `${attachmentId}:v${version}`;
};

/**
 * Parses a version ID back into its components.
 */
export const parseVersionId = (
  versionId: string
): { attachmentId: string; version: number } | undefined => {
  const match = versionId.match(/^(.+):v(\d+)$/);
  if (!match) {
    return undefined;
  }
  return {
    attachmentId: match[1],
    version: parseInt(match[2], 10),
  };
};

/**
 * Checks if an attachment's current version is active (not deleted).
 */
export const isAttachmentActive = <T = unknown>(
  attachment: VersionedAttachment<string, T>
): boolean => {
  return attachment.active !== false;
};

/**
 * Gets all active (non-deleted) attachments from a list.
 */
export const getActiveAttachments = <T = unknown>(
  attachments: VersionedAttachment<string, T>[]
): VersionedAttachment<string, T>[] => {
  return attachments.filter(isAttachmentActive);
};

/**
 * Simple hash function for content deduplication.
 * Uses a basic string hash - suitable for detecting duplicates.
 */
export const hashContent = (data: unknown): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + char;
    // eslint-disable-next-line no-bitwise
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * Estimates token count for attachment data.
 * Uses a simple heuristic: ~4 characters per token.
 */
export const estimateTokens = (data: unknown): number => {
  const str = JSON.stringify(data);
  return Math.ceil(str.length / 4);
};
