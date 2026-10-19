/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { ID_MAX_LENGTH, ruleIdSchema, ruleKindSchema } from '@kbn/alerting-v2-schemas';

/** Maximum length of an app id carried on a rule-change event. */
export const RULE_EVENT_APP_MAX_LENGTH = 64;

export const RULE_CREATED_EBT_EVENT_TYPE = 'alerting_v2_rule_created' as const;
export const RULE_UPDATED_EBT_EVENT_TYPE = 'alerting_v2_rule_updated' as const;
export const RULE_DELETED_EBT_EVENT_TYPE = 'alerting_v2_rule_deleted' as const;
export const RULE_ENABLED_EBT_EVENT_TYPE = 'alerting_v2_rule_enabled' as const;
export const RULE_DISABLED_EBT_EVENT_TYPE = 'alerting_v2_rule_disabled' as const;

/** EBT event types registered for a rule change. The event type is the operation. */
export const RULE_EBT_EVENT_TYPES = [
  RULE_CREATED_EBT_EVENT_TYPE,
  RULE_UPDATED_EBT_EVENT_TYPE,
  RULE_DELETED_EBT_EVENT_TYPE,
  RULE_ENABLED_EBT_EVENT_TYPE,
  RULE_DISABLED_EBT_EVENT_TYPE,
] as const;

export const ruleEbtEventTypeTelemetrySchema = lazySchema(() => z.enum(RULE_EBT_EVENT_TYPES));

export type RuleEbtEventType = z.infer<typeof ruleEbtEventTypeTelemetrySchema>;

/**
 * Channels a rule change can be made through.
 *
 * - `system`: Kibana acting on its own behalf (for example a task).
 * - `ui`: a request made by the Kibana browser app.
 * - `api`: any other request.
 */
export const RULE_EVENT_CHANNELS = ['system', 'ui', 'api'] as const;

export const ruleEventChannelTelemetrySchema = lazySchema(() => z.enum(RULE_EVENT_CHANNELS));

export type RuleEbtChannel = z.infer<typeof ruleEventChannelTelemetrySchema>;

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

export type RuleEbtApp = z.infer<typeof ruleEventAppTelemetrySchema>;

/**
 * Channel, app, and optional actor derived from the request. Actor is optional
 * because the rules client may not yet know who made the change at resolve time.
 */
export const ruleEventOriginTelemetrySchema = lazySchema(() =>
  z.object({
    channel: ruleEventChannelTelemetrySchema,
    app: ruleEventAppTelemetrySchema.optional(),
    actor: ruleEventActorTelemetrySchema.optional(),
  })
);

export type RuleEbtOrigin = z.infer<typeof ruleEventOriginTelemetrySchema>;

/** Who made a rule change. Matches the rules client's event origin. */
export const RULE_EVENT_ACTORS = ['user', 'internal'] as const;

export const ruleEventActorTelemetrySchema = lazySchema(() =>
  z
    .enum(RULE_EVENT_ACTORS)
    .describe(
      'Who made the change: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.'
    )
);

export type RuleEbtActor = z.infer<typeof ruleEventActorTelemetrySchema>;

/**
 * Origin recorded on a rule-change telemetry event. Adds {@link RuleEbtActor}
 * to the request-derived channel and app.
 */
export const ruleChangedEventOriginTelemetrySchema = lazySchema(() =>
  z.object({
    actor: ruleEventActorTelemetrySchema,
    channel: ruleEventChannelTelemetrySchema,
    app: ruleEventAppTelemetrySchema.optional(),
  })
);

export type RuleChangedEventOrigin = z.infer<typeof ruleChangedEventOriginTelemetrySchema>;

/** Same bound as the rule metadata builder type. */
const RULE_BUILDER_TYPE_MAX_LENGTH = 64;

/** Payload shared by every rule-change telemetry event. */
export const ruleChangedTelemetryDataSchema = lazySchema(() =>
  z.object({
    rule_id: ruleIdSchema.describe('The id of the rule that was changed.'),
    template_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .optional()
      .describe('The id of the rule template the rule was installed from, when known.'),
    created_at: isoDateTime()
      .optional()
      .describe(
        'ISO timestamp of when the rule was created. Absent when the domain rule could not be read.'
      ),
    kind: ruleKindSchema
      .optional()
      .describe(
        'Whether the rule creates alerts (`alert`) or only stores matching events (`signal`). Absent when the domain rule could not be read.'
      ),
    builder_type: z
      .string()
      .min(1)
      .max(RULE_BUILDER_TYPE_MAX_LENGTH)
      .optional()
      .describe('The rule builder the rule was authored with, when it was created by a builder.'),
    enabled: z
      .boolean()
      .optional()
      .describe(
        'Whether the rule was enabled after the operation (for a delete, whether it was enabled when deleted). Absent when the domain rule could not be read.'
      ),
    origin: ruleChangedEventOriginTelemetrySchema.describe('Where the change came from.'),
  })
);

export type RuleChangedEbtData = z.infer<typeof ruleChangedTelemetryDataSchema>;
