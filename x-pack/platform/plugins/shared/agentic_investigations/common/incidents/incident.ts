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
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
} from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import {
  INCIDENT_LINKED_INVESTIGATIONS_FIELD,
  MAX_INCIDENT_LINKED_INVESTIGATIONS,
  MAX_INCIDENTS_PAGE_SIZE,
  MAX_INCIDENTS_RESULT_WINDOW,
} from './constants';

/**
 * An incident is a templated conversation of the `incident` type
 */
export type IncidentConversation = ConversationWithPermissions;

/** Conversation ids are UUIDs; the bound matches what the conversation client accepts. */
const conversationIdSchema = z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH);

/** A user profile uid, bounded to the length the conversation ACL enforces. */
const collaboratorIdSchema = z
  .string()
  .min(1)
  .max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH);

export const incidentVisibilitySchema = z.enum(['private', 'public']);
export type IncidentVisibility = z.infer<typeof incidentVisibilitySchema>;

export const createIncidentRequestSchema = z
  .object({
    /**
     * The investigation to escalate. A single id, not an array: an incident is opened
     * *from* one investigation. Further investigations are attached through the update
     * route afterwards.
     */
    linked_investigation_id: conversationIdSchema,
    visibility: incidentVisibilitySchema,
    /**
     * List of user profile uids to add as collaborators. Required when
     * visibility is "private"; must be omitted (or empty) when "public".
     */
    collaborators: z
      .array(collaboratorIdSchema)
      .max(CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES)
      .default([]),
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

export type CreateIncidentRequest = z.infer<typeof createIncidentRequestSchema>;

export const updateIncidentRequestSchema = z
  .object({
    title: z.string().min(1).max(CONVERSATION_TITLE_MAX_LENGTH).optional(),
    /**
     * Investigation ids to add to the incident. Append-only — this route cannot unlink.
     * MVP caveat: the union is computed outside the OCC write callback, so two concurrent
     * requests could each read the same stale list and one link could be silently lost.
     * Follow-up: elastic/security-team#19370 (race-safe append).
     */
    [INCIDENT_LINKED_INVESTIGATIONS_FIELD]: z
      .array(conversationIdSchema)
      .min(1)
      .max(MAX_INCIDENT_LINKED_INVESTIGATIONS)
      .optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined || value[INCIDENT_LINKED_INVESTIGATIONS_FIELD] !== undefined,
    { message: 'at least one of title or linked_investigations must be provided' }
  );

export type UpdateIncidentRequest = z.infer<typeof updateIncidentRequestSchema>;

/**
 * Query parameters for the list incidents endpoint.
 *
 * Uses `z.coerce.number()` because query-string values arrive as strings.
 * The `page * per_page` refinement mirrors agent_builder's `_search` route guard:
 * results beyond MAX_INCIDENTS_RESULT_WINDOW are unreachable through offset
 * pagination, so requesting them is always an error rather than an empty page.
 */
export const listIncidentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_INCIDENTS_PAGE_SIZE)
      .default(MAX_INCIDENTS_PAGE_SIZE),
  })
  .refine(({ page, per_page: perPage }) => page * perPage <= MAX_INCIDENTS_RESULT_WINDOW, {
    message: `page * per_page must not exceed ${MAX_INCIDENTS_RESULT_WINDOW}; incidents beyond that are not reachable through this API`,
  });

export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

/**
 * An incident as returned by the **list** endpoint.
 */
export type IncidentConversationSummary = ConversationWithoutRoundsWithPermissions;

export interface ListIncidentsResponse {
  pagination: { total: number; page: number; per_page: number };
  results: IncidentConversationSummary[];
}
