/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_ESCALATION_ASSIGNEES } from '../escalations/constants';
import { eventViaSchema } from '../conversation_events/via';
import { assigneeIdSchema } from './assignment';

/** Written whenever the assignee list of an investigation or escalation changes. */
export const ASSIGNEES_CHANGED_EVENT_TYPE = 'assignees_changed' as const;

/**
 * Profile uids only: names are resolved when the event is rendered so they stay current. The
 * actor (who made the change) is recorded by Agent Builder on the event itself.
 */
export const assigneesChangedEventSchema = z
  .object({
    added: z.array(assigneeIdSchema).max(MAX_ESCALATION_ASSIGNEES),
    removed: z.array(assigneeIdSchema).max(MAX_ESCALATION_ASSIGNEES),
    via: eventViaSchema.optional(),
  })
  .refine((data) => data.added.length + data.removed.length > 0, {
    message: 'At least one assignee must be added or removed',
  });

export type AssigneesChangedEventData = z.infer<typeof assigneesChangedEventSchema>;
