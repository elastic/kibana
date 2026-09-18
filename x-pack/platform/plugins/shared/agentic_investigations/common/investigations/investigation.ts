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

/**
 * A single assignee is a user profile uid, bounded to the length the
 * conversation ACL enforces so the two limits cannot drift.
 */
const assigneeSchema = z.string().min(1).max(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH);

/** An investigation id is a conversation id. */
export const investigationIdParamsSchema = z.object({
  id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH),
});
export type InvestigationIdParams = z.infer<typeof investigationIdParamsSchema>;

/**
 * Body for PATCH /internal/investigations/investigations/{id}/assignees.
 *
 * Overwrite semantics: the supplied list replaces whatever is stored. An empty
 * array removes all assignees. Bounded at 100 to match the escalation collaborator
 * limit so a private escalation linked to an investigation can mirror its assignees
 * one-for-one without hitting a separate ceiling.
 */
export const updateAssigneesRequestSchema = z.object({
  assignees: z.array(assigneeSchema).max(100),
});
export type UpdateAssigneesRequest = z.infer<typeof updateAssigneesRequestSchema>;

export interface UpdateAssigneesResponse {
  assignees: string[];
}
