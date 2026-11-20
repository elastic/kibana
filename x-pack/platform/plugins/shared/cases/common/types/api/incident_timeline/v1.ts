/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_ALERTS_PER_CASE } from '../../../constants';

const MAX_FIELD_LENGTH = 1024;
const MAX_NAMES_PER_ALERT = 100;

export const IncidentTimelineAlertSchema = lazySchema(() =>
  z.object({
    id: z.string().max(512),
    index: z.string().max(MAX_FIELD_LENGTH),
    /**
     * `kibana.alert.original_time`. For an EQL sequence shell, whose `original_time` is the rule run
     * time, the earliest `original_time` of its building blocks. `@timestamp` when neither exists.
     */
    time: z.string().max(50),
    timeSource: z.enum(['original_time', 'sequence_start', 'timestamp']),
    timestamp: z.string().max(50),
    ruleId: z.string().max(MAX_FIELD_LENGTH).optional(),
    ruleName: z.string().max(MAX_FIELD_LENGTH).optional(),
    severity: z.string().max(MAX_FIELD_LENGTH).optional(),
    hostNames: z.array(z.string().max(MAX_FIELD_LENGTH)).max(MAX_NAMES_PER_ALERT),
    userNames: z.array(z.string().max(MAX_FIELD_LENGTH)).max(MAX_NAMES_PER_ALERT),
  })
);

export const IncidentTimelineAlertsResponseSchema = lazySchema(() =>
  z.object({
    alerts: z.array(IncidentTimelineAlertSchema).max(MAX_ALERTS_PER_CASE),
    /** Alert ids attached to the case, linked-project ones included. */
    attached: z.number(),
    /** Attached on the origin cluster but not returned by the search. */
    notFound: z.number(),
    /** Dropped because their index belongs to a linked project. */
    remote: z.number(),
    atLimit: z.boolean(),
  })
);

export type IncidentTimelineAlert = z.infer<typeof IncidentTimelineAlertSchema>;
export type IncidentTimelineAlertsResponse = z.infer<typeof IncidentTimelineAlertsResponseSchema>;
