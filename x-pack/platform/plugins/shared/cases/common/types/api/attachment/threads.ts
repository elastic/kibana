/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserSchema } from '../../domain/user/v1';
import { UnifiedAttachmentsSchema } from '../../domain/attachment/v2';

/**
 * Reply API
 */
export const AttachmentRepliesResponseSchema = lazySchema(() =>
  z.object({ replies: UnifiedAttachmentsSchema })
);

export const AttachmentThreadSummarySchema = lazySchema(() =>
  z.object({
    lastReplyAt: z.string().nullable(),
    /** The latest distinct repliers, newest first. */
    participants: z.array(UserSchema),
  })
);

export const AttachmentReplyCountsResponseSchema = lazySchema(() =>
  z.object({
    counts: z.record(z.string(), z.number()),
    threads: z.record(z.string(), AttachmentThreadSummarySchema),
  })
);

export type AttachmentRepliesResponse = z.infer<typeof AttachmentRepliesResponseSchema>;
export type AttachmentReplyCountsResponse = z.infer<typeof AttachmentReplyCountsResponseSchema>;
export type AttachmentThreadSummary = z.infer<typeof AttachmentThreadSummarySchema>;
