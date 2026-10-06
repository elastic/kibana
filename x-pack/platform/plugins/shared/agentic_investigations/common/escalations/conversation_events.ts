/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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
  investigation_id: z.string().min(1),
  title: z.string(),
  agent_id: z.string().optional(),
});

export type EscalationInvestigationEventData = z.infer<typeof escalationInvestigationEventSchema>;
