/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserSchema } from '../../domain/user/v1';

/**
 * Inbox API. Reasons: `mention` (a comment mentions the user), `reply` (a reply to the
 * user's comment), `assignment` (the user was assigned to a case).
 */
export const InboxReasonValues = ['mention', 'reply', 'assignment'] as const;

export const InboxItemSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    caseId: z.string(),
    caseTitle: z.string(),
    owner: z.string(),
    /** The feed comment to scroll to; the parent comment for replies. Not set for assignments. */
    commentId: z.string().optional(),
    /** The parent comment whose thread holds the item. Only set for replies. */
    threadId: z.string().optional(),
    /** The comment text. Not set for assignments. */
    content: z.string().optional(),
    createdAt: z.string(),
    createdBy: UserSchema,
    reason: z.enum(InboxReasonValues),
  })
);

export const InboxFindResponseSchema = lazySchema(() =>
  z.object({
    items: z.array(InboxItemSchema),
  })
);

export type InboxReason = (typeof InboxReasonValues)[number];
export type InboxItem = z.infer<typeof InboxItemSchema>;
export type InboxFindResponse = z.infer<typeof InboxFindResponseSchema>;
