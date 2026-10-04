/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_GET_ATTACHMENTS } from '../../../constants';
import { limitedArraySchema } from '../../../schema';

export const BulkGetConversationsRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: rt.string,
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export type BulkGetConversationsRequest = rt.TypeOf<typeof BulkGetConversationsRequestRt>;

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
