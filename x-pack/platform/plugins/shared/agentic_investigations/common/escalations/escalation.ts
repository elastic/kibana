/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
} from '@kbn/agent-builder-common';
import type {
  Conversation,
  ConversationWithoutRoundsWithPermissions,
} from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import {
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  MAX_ESCALATION_ASSIGNEES,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  MAX_ESCALATIONS_PAGE_SIZE,
  MAX_ESCALATIONS_RESULT_WINDOW,
} from './constants';

/**
 * An escalation is a templated conversation of the `escalation` type
 */
export type EscalationConversation = Conversation;

/** Conversation ids are UUIDs; the bound matches what the conversation client accepts. */
const conversationIdSchema = z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH);

/** A user profile uid, bounded to the length the conversation ACL enforces. */
const collaboratorIdSchema = z
  .string()
  .min(1)
  .max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH);

export const escalationVisibilitySchema = z.enum(['private', 'public']);
export type EscalationVisibility = z.infer<typeof escalationVisibilitySchema>;

/**
 * The open/closed status of an escalation. Values must stay in sync with the `status`
 * field options in the escalation conversation template
 * (`agent_builder_platform/server/conversation_templates/escalation.ts`).
 */
export const escalationStatusSchema = z.enum(['open', 'closed']);
export type EscalationStatus = z.infer<typeof escalationStatusSchema>;

export const createEscalationRequestSchema = z
  .object({
    /**
     * The investigation to escalate. A single id, not an array: an escalation is opened
     * *from* one investigation. Further investigations are attached through the update
     * route afterwards.
     */
    linked_investigation_id: conversationIdSchema,
    /** Escalation title. Defaults to the linked investigation's title if omitted. */
    title: z.string().min(1).max(CONVERSATION_TITLE_MAX_LENGTH).optional(),
    visibility: escalationVisibilitySchema,
    /**
     * List of user profile uids to add as collaborators. Required when
     * visibility is "private"; must be omitted (or empty) when "public".
     */
    collaborators: z
      .array(collaboratorIdSchema)
      .max(CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES)
      .default([]),
    /**
     * User profile uids to assign to the escalation. Stored in `metadata.assignees`.
     * Defaults to empty — callers that know the current user's uid should include it
     * so the creator is automatically listed as a responsible party.
     */
    assignees: z.array(collaboratorIdSchema).max(MAX_ESCALATION_ASSIGNEES).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.visibility === 'private' && value.collaborators.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['collaborators'],
        message: 'collaborators is required when visibility is "private"',
      });
    }

    if (value.visibility === 'public' && value.collaborators.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['collaborators'],
        message: 'collaborators must not be set when visibility is "public"',
      });
    }
  });

export type CreateEscalationRequest = z.infer<typeof createEscalationRequestSchema>;

/**
 * Request body for the `POST /{id}/_link` endpoint.
 * Append-only — this endpoint cannot unlink investigations.
 * MVP caveat: the union is computed outside the OCC write callback, so two concurrent
 * requests could each read the same stale list and one link could be silently lost.
 * Follow-up: elastic/security-team#19370 (race-safe append).
 */
export const linkEscalationRequestSchema = z.object({
  [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: z
    .array(conversationIdSchema)
    .min(1)
    .max(MAX_ESCALATION_LINKED_INVESTIGATIONS),
});

export type LinkEscalationRequest = z.infer<typeof linkEscalationRequestSchema>;

/**
 * Query parameters for the list escalations endpoint.
 *
 * Uses `z.coerce.number()` because query-string values arrive as strings.
 * The `page * per_page` refinement mirrors agent_builder's `_search` route guard:
 * results beyond MAX_ESCALATIONS_RESULT_WINDOW are unreachable through offset
 * pagination, so requesting them is always an error rather than an empty page.
 *
 * `status` defaults to `'open'` to preserve backward compatibility for callers
 * that do not send the parameter. `'all'` is provided for admin / diagnostic use.
 */
export const listEscalationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_ESCALATIONS_PAGE_SIZE)
      .default(MAX_ESCALATIONS_PAGE_SIZE),
    status: z.enum(['open', 'closed', 'all']).default('open'),
    search: z.string().max(256).optional(),
    /**
     * When set, only escalations that have this investigation id in their
     * `metadata.linked_investigations` array are returned. Useful for checking
     * whether an investigation is already part of one or more escalations before
     * opening the escalation creation modal.
     */
    linked_investigation_id: conversationIdSchema.optional(),
  })
  .refine(({ page, per_page: perPage }) => page * perPage <= MAX_ESCALATIONS_RESULT_WINDOW, {
    message: `page * per_page must not exceed ${MAX_ESCALATIONS_RESULT_WINDOW}; escalations beyond that are not reachable through this API`,
  });

export type ListEscalationsQuery = z.infer<typeof listEscalationsQuerySchema>;

/**
 * An escalation as returned by the **list** endpoint.
 */
export type EscalationConversationSummary = ConversationWithoutRoundsWithPermissions;

export interface ListEscalationsResponse {
  pagination: { total: number; page: number; per_page: number };
  results: EscalationConversationSummary[];
}

/**
 * A brief summary of an investigation linked to an escalation, as returned by the
 * `GET /escalations/{id}/linked_investigations` route.
 *
 * `status` follows the same "missing or non-closed ⇒ open" rule as the escalations list filter.
 */
export interface LinkedInvestigationSummary {
  /** Investigation conversation id. */
  id: string;
  title: string;
  /** Open/closed status derived from `metadata.status`. */
  status: 'open' | 'closed';
  /** Agent Builder agent id, used for deep-linking to the conversation. */
  agent_id: string;
}

export interface ListLinkedInvestigationsResponse {
  results: LinkedInvestigationSummary[];
}
