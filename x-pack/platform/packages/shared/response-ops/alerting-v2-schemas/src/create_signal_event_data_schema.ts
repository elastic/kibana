/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  createAlertEventBodyBaseObjectSchema,
  eventSourceSchema,
  externalEventSourceSchema,
} from './create_alert_event_data_schema';

/**
 * The status a signal reading is stored with. A reading that is not `breached` lets a
 * writer record an explicit recovery or a missing reading. This repeats the values of the
 * stored event status, which the plugin owns, and a plugin test keeps the two in sync.
 */
export const signalEventStatusSchema = lazySchema(() =>
  z.enum(['breached', 'recovered', 'no_data'])
);

/**
 * The fields of a signal event, with a plain `source`.
 *
 * A signal is an observation-only event: it has no alert lifecycle, so the caller cannot
 * set `alert_status`, and it is not tied to a rule, so there is no `rule_id`.
 * Series identity is optional. With neither `fingerprint` nor `fingerprint_fields`,
 * every signal from one source in one space shares a single series.
 * `status` is the stored reading status and defaults to `breached`.
 */
const signalEventBaseObjectSchema = lazySchema(() =>
  createAlertEventBodyBaseObjectSchema.omit({ alert_status: true, rule_id: true }).extend({
    status: signalEventStatusSchema.optional(),
  })
);

/**
 * Used by `AlertEventsClient.createSignalEvent`. Any source is accepted, so Kibana plugins
 * can write sources under the reserved `elastic` prefix, as they already can for alerts.
 */
export const createSignalEventInternalDataSchema = lazySchema(() =>
  signalEventBaseObjectSchema
    .extend({
      source: eventSourceSchema,
    })
    .strict()
);

/**
 * Used as the input schema for the `alerting.create_signal` workflow step, which is the
 * external surface, so the reserved source prefix is rejected here.
 */
export const createSignalEventDataSchema = lazySchema(() =>
  signalEventBaseObjectSchema
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

export type SignalEventStatus = z.infer<typeof signalEventStatusSchema>;
export type CreateSignalEventData = z.infer<typeof createSignalEventInternalDataSchema>;
export type CreateSignalEventResponse = z.infer<typeof createSignalEventResponseSchema>;
