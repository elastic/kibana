/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalSyncCommentMetadata } from '../types/domain/attachment/comment/v2';
import { ExternalSyncCommentMetadataSchema } from '../types/domain/attachment/comment/v2';

/** Returns the `metadata.externalSync` attribution of a comment attachment, if any. */
export const getExternalSyncCommentMetadata = (
  attachment: unknown
): ExternalSyncCommentMetadata | undefined => {
  if (attachment == null || typeof attachment !== 'object' || !('metadata' in attachment)) {
    return undefined;
  }

  const metadata = (attachment as { metadata?: unknown }).metadata;
  if (metadata == null || typeof metadata !== 'object' || !('externalSync' in metadata)) {
    return undefined;
  }

  const parsed = ExternalSyncCommentMetadataSchema.safeParse(
    (metadata as { externalSync?: unknown }).externalSync
  );

  return parsed.success ? parsed.data : undefined;
};

export const isExternalSyncComment = (attachment: unknown): boolean =>
  getExternalSyncCommentMetadata(attachment) != null;
