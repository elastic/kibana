/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
  agentIdMaxLength,
} from '@kbn/agent-builder-common';

/** Written once, when an escalation is created from an investigation. */
export const ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE =
  'escalation_created_from_investigation' as const;

/** Written for every investigation that is later linked to an existing escalation. */
export const ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE =
  'escalation_investigation_linked' as const;

/**
 * Payload shared by both escalation timeline events. The title and agent id are snapshots taken
 * when the event is written, so rendering needs no extra fetch and survives later changes.
 */
export const escalationInvestigationEventSchema = z.object({
  investigation_id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH),
  // Bounded by the conversation title limit, since it is a snapshot of an investigation's title.
  title: z.string().max(CONVERSATION_TITLE_MAX_LENGTH),
  agent_id: z.string().min(1).max(agentIdMaxLength).optional(),
});

export type EscalationInvestigationEventData = z.infer<typeof escalationInvestigationEventSchema>;
