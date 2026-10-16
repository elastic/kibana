/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { RULE_EVENT_APP_MAX_LENGTH } from './constants';

/**
 * Channels a rule change can be made through.
 *
 * - `system`: Kibana acting on its own behalf (for example a task).
 * - `ui`: a request made by the Kibana browser app.
 * - `api`: any other request.
 */
export const RULE_EVENT_CHANNELS = ['system', 'ui', 'api'] as const;

export const ruleEventChannelTelemetrySchema = lazySchema(() => z.enum(RULE_EVENT_CHANNELS));

export type RuleEventChannel = z.infer<typeof ruleEventChannelTelemetrySchema>;

/**
 * App id carried on a rule-change telemetry event. Bounded so telemetry cannot
 * record an arbitrary or very long value.
 */
export const ruleEventAppTelemetrySchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(RULE_EVENT_APP_MAX_LENGTH)
    .regex(
      /^[A-Za-z0-9_.:-]+$/,
      'Must contain only letters, digits, underscores, dots, colons, and hyphens.'
    )
    .describe('App the rule change was made from.')
);

export type RuleEventApp = z.infer<typeof ruleEventAppTelemetrySchema>;

/** Where a rule change came from. `app` is omitted when it is unknown or rejected. */
export const ruleEventOriginTelemetrySchema = lazySchema(() =>
  z.object({
    channel: ruleEventChannelTelemetrySchema,
    app: ruleEventAppTelemetrySchema.optional(),
  })
);

export type RuleEventOrigin = z.infer<typeof ruleEventOriginTelemetrySchema>;
