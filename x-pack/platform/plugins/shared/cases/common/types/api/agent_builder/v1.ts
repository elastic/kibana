/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_BULK_GET_ATTACHMENTS } from '../../../constants';
import { limitedArraySchema } from '../../../schema';

export const BulkGetConversationsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: z.string(),
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export type BulkGetConversationsRequest = z.infer<typeof BulkGetConversationsRequestSchema>;

export interface ConversationSummary {
  id: string;
  title: string;
  agent_id: string;
  access_mode: 'public' | 'private';
}

/** Only the conversations the requester can open are returned. */
export interface BulkGetConversationsResponse {
  conversations: ConversationSummary[];
}
