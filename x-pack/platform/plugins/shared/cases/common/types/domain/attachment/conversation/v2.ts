/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_OWNER_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../../constants';

/**
 * Both fields are filled by the server from the referenced conversation at
 * attach time, so callers only need to send the conversation id.
 */
export const ConversationAttachmentMetadataSchema = z
  .object({
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    agentId: z.string().max(MAX_ATTACHMENT_ID_LENGTH).optional(),
  })
  .strict();
export type ConversationAttachmentMetadata = z.infer<typeof ConversationAttachmentMetadataSchema>;

export const ConversationAttachmentPayloadSchema = z
  .object({
    type: z.literal(AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE),
    owner: z.string().max(MAX_OWNER_LENGTH),
    attachmentId: z.string().min(1).max(MAX_ATTACHMENT_ID_LENGTH),
    metadata: ConversationAttachmentMetadataSchema.optional(),
  })
  .strict();
export type ConversationAttachmentPayload = z.infer<typeof ConversationAttachmentPayloadSchema>;
