/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/** Maximum length of an app id carried on a rule-change event. */
export const RULE_EVENT_APP_MAX_LENGTH = 64;

/**
 * Channels a rule change can be made through.
 *
 * - `system`: Kibana acting on its own behalf (for example a task).
 * - `ui`: a request made by the Kibana browser app.
 * - `api`: any other request.
 */
export const RULE_EVENT_CHANNELS = ['system', 'ui', 'api'] as const;

export const ruleEventChannelSchema = lazySchema(() => z.enum(RULE_EVENT_CHANNELS));

export type RuleEventChannel = z.infer<typeof ruleEventChannelSchema>;

/**
 * App id carried on a rule-change event. Bounded so telemetry cannot
 * record an arbitrary or very long value.
 */
export const ruleEventAppSchema = lazySchema(() =>
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

export type RuleEventApp = z.infer<typeof ruleEventAppSchema>;

/** Who made a rule change. Matches the rules client's event origin. */
export const RULE_EVENT_ACTORS = ['user', 'internal'] as const;

export const ruleEventActorSchema = lazySchema(() =>
  z
    .enum(RULE_EVENT_ACTORS)
    .describe(
      'Who made the change: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.'
    )
);

export type RuleEventActor = z.infer<typeof ruleEventActorSchema>;

/**
 * Channel, app, and optional actor derived from the request. Actor is optional
 * because the rules client may not yet know who made the change at resolve time.
 */
export const ruleEventOriginSchema = lazySchema(() =>
  z.object({
    channel: ruleEventChannelSchema,
    app: ruleEventAppSchema.optional(),
    actor: ruleEventActorSchema.optional(),
  })
);

export type RuleEventOrigin = z.infer<typeof ruleEventOriginSchema>;

/**
 * Origin recorded on a rule-change event. Adds {@link RuleEventActor}
 * to the request-derived channel and app.
 */
export const ruleChangedEventOriginSchema = lazySchema(() =>
  z.object({
    actor: ruleEventActorSchema,
    channel: ruleEventChannelSchema,
    app: ruleEventAppSchema.optional(),
  })
);

export type RuleChangedEventOrigin = z.infer<typeof ruleChangedEventOriginSchema>;
