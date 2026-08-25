/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CONVERSATION_ID_MAX_LENGTH,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

export const ConversationIdSchema = z
  .string()
  .min(1)
  .max(CONVERSATION_ID_MAX_LENGTH)
  .describe('The ID of the conversation.');

const ConversationUserSchema = z.object({
  id: z.string().optional().describe('Profile UUID of the user, when available.'),
  username: z.string().describe('Username of the user.'),
});

/**
 * A single entry of a conversation's timeline. `data` is left unstructured because its shape
 * depends on `type`; see the `TimelineEvent` union in `@kbn/agent-builder-common`.
 */
export const ConversationEventSchema = z.object({
  id: z.string().describe('Unique ID of the event.'),
  type: z.enum(TimelineEventType).describe('The kind of timeline event.'),
  created_at: z.string().describe('When the event occurred, as an ISO date string.'),
  actor: z
    .object({
      type: z.enum(EventActorType).describe('The kind of participant that produced the event.'),
      id: z.string().describe('Stable identifier of the participant.'),
      username: z.string().optional().describe('Username or handle of the participant.'),
      full_name: z.string().optional().describe('Display name of the participant.'),
    })
    .describe('Who produced the event.'),
  execution_id: z
    .string()
    .optional()
    .describe('Correlation key grouping the lifecycle events of a single agent run.'),
  trigger_event_id: z
    .string()
    .optional()
    .describe('ID of the content event that triggered the run this event belongs to.'),
  data: z.unknown().describe('Type-specific payload of the event.'),
});

export const ConversationAccessModeSchema = z
  .enum(ConversationAccessControlMode)
  .describe('Who can see the conversation.');

/**
 * A metadata value as callers supply it, mirroring `MetadataFieldValue`.
 */
export const ConversationMetadataSchema = z
  .record(z.string().max(1024), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()]))
  .describe('Template-defined metadata stored on the conversation.');

/**
 * Fields present on both a full conversation and a list entry.
 */
const conversationSummaryShape = {
  id: z.string().describe('Unique ID of the conversation.'),
  agent_id: z.string().describe('ID of the agent this conversation is bound to.'),
  title: z.string().describe('Title of the conversation.'),
  created_at: z.string().describe('Creation date, as an ISO date string.'),
  updated_at: z.string().describe('Last update date, as an ISO date string.'),
  user: ConversationUserSchema.describe('Owner of the conversation.'),
  status: z.enum(ConversationRoundStatus).optional().describe('Status of the latest round.'),
  read: z.boolean().optional().describe('Whether the conversation has been marked as read.'),
  pinned: z.boolean().optional().describe('Whether the conversation has been pinned.'),
  workspace_id: z.string().optional().describe('ID of the bash/VFS workspace, when one exists.'),
  template_id: z.string().optional().describe('ID of the applied conversation template.'),
  template_version: z.number().optional().describe('Version of the applied template.'),
  metadata: ConversationMetadataSchema.optional(),
};

/**
 * A conversation without its rounds, as returned when listing.
 */
export const ConversationSummarySchema = z.object(conversationSummaryShape);

/**
 * A full conversation. `rounds` and `attachments` are left unstructured: they are deeply nested
 * and evolve with the agent runtime, so mirroring them here would drift from the source types.
 */
export const ConversationSchema = z.object({
  ...conversationSummaryShape,
  rounds: z
    .array(z.unknown())
    .describe('The conversation rounds, each holding one user/agent exchange.'),
  events: z
    .array(ConversationEventSchema)
    .optional()
    .describe('Chronological timeline of the conversation.'),
  attachments: z
    .array(z.unknown())
    .optional()
    .describe('Conversation-level versioned attachments.'),
});
