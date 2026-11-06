/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  createAlertEventBodyBaseObjectSchema,
  externalEventSourceSchema,
} from './create_alert_event_data_schema';

/**
 * Used as the input schema for the `alerting.create_signal` workflow step.
 *
 * A signal is an observation-only event: it has no lifecycle, so the caller cannot
 * set `alert_status`, and it is not tied to a rule, so there is no `rule_id`.
 * Series identity is optional. With neither `fingerprint` nor `fingerprint_fields`,
 * every signal from one source in one space shares a single series.
 */
export const createSignalEventDataSchema = lazySchema(() =>
  createAlertEventBodyBaseObjectSchema
    .omit({ alert_status: true, rule_id: true })
    .extend({
      source: externalEventSourceSchema,
    })
    .strict()
);

export const createSignalEventResponseSchema = lazySchema(() =>
  z.object({
    group_hash: z.string(),
  })
);

export type CreateSignalEventData = z.infer<typeof createSignalEventDataSchema>;
export type CreateSignalEventResponse = z.infer<typeof createSignalEventResponseSchema>;
