/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
} from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import { MAX_ESCALATION_ASSIGNEES } from '../escalations/constants';

/** A user profile uid, bounded to the length the conversation ACL enforces. */
const assigneeIdSchema = z.string().min(1).max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH);

const conversationIdSchema = z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH);

export const assignConversationRequestParamsSchema = z.object({
  id: conversationIdSchema,
});

/**
 * Replace-in-full assignee list. The caller sends the complete desired set;
 * omitting a uid removes it.
 */
export const assignConversationRequestBodySchema = z.object({
  assignees: z.array(assigneeIdSchema).max(MAX_ESCALATION_ASSIGNEES),
});

export type AssignConversationRequest = z.infer<typeof assignConversationRequestBodySchema>;
