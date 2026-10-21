/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/** Written whenever the status of an investigation or escalation changes. */
export const STATUS_CHANGED_EVENT_TYPE = 'status_changed' as const;

const statusSchema = z.enum(['open', 'closed']);

/** The actor (who made the change) is recorded by Agent Builder on the event itself. */
export const statusChangedEventSchema = z.object({
  from: statusSchema.optional(),
  to: statusSchema,
});

export type StatusChangedEventData = z.infer<typeof statusChangedEventSchema>;
