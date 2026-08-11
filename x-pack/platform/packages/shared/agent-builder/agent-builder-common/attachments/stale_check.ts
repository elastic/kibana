/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from './attachments';

export type StaleAttachment = Attachment & { is_stale: true; origin: string };

export interface FreshAttachment {
  id: string;
  is_stale: false;
  /**
   * When present, the staleness check failed for this attachment (e.g. `isStale` or `resolve` threw).
   */
  error?: string;
}

export type AttachmentStaleCheckResult = StaleAttachment | FreshAttachment;

/** Fresh result where the server reported that staleness evaluation failed for this attachment. */
export type FreshAttachmentStalenessCheckError = FreshAttachment & { error: string };

export function isFreshAttachmentStalenessCheckError(
  result: AttachmentStaleCheckResult
): result is FreshAttachmentStalenessCheckError {
  return result.is_stale === false && typeof result.error === 'string' && result.error.length > 0;
}
