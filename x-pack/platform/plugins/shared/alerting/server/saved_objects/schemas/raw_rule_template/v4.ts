/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV3 } from './v3';

/**
 * Alerting v1 / Fleet (`.es-query`) template layout with optional engine field.
 */
export const alertingV1RawRuleTemplateSchemaV4 = rawRuleTemplateSchemaV3.extends({
  engine: schema.maybe(schema.string()),
});

/**
 * Alerting v2 template layout.
 *
 * Create-rule fields live under `rule` as an opaque bag so the SO schema does not
 * duplicate `@kbn/alerting-v2-schemas` create-rule validation. Full validation of
 * `rule` (including create-rule refines) is owned by Zod (`ruleTemplateDataSchema`).
 */
export const alertingV2RawRuleTemplateSchemaV4 = schema.object({
  engine: schema.literal('v2'),
  rule: schema.object({}, { unknowns: 'allow' }),
});

/**
 * Read-only variant of {@link alertingV2RawRuleTemplateSchemaV4} for the
 * `forwardCompatibility` of every model version before the query collapse.
 *
 * `rule` is stored as an opaque bag with `unknowns: 'allow'`, which keeps
 * unknown keys rather than dropping them, so a node on one of these versions
 * would otherwise read the collapsed keys a later version added and fail its
 * `.strict()` Zod validation. Enumerating the pre-collapse key names with
 * `unknowns: 'ignore'` drops those additions on read; the values stay `any`
 * because validating `rule` belongs to `@kbn/alerting-v2-schemas`.
 */
const legacyValue = schema.maybe(schema.any());

const legacyComposedQuery = schema.object(
  {
    format: schema.literal('composed'),
    base: schema.string(),
    breach: legacyValue,
    recovery: legacyValue,
    no_data: legacyValue,
  },
  { unknowns: 'ignore' }
);

// A standalone query has no `base`, so listing it only on the composed branch is
// what drops the `base` the collapse derives from `breach.query`.
const legacyStandaloneQuery = schema.object(
  {
    format: schema.literal('standalone'),
    breach: legacyValue,
    recovery: legacyValue,
    no_data: legacyValue,
  },
  { unknowns: 'ignore' }
);

const legacyStateTransition = schema.object(
  {
    pending_operator: legacyValue,
    pending_count: legacyValue,
    pending_timeframe: legacyValue,
    recovering_operator: legacyValue,
    recovering_count: legacyValue,
    recovering_timeframe: legacyValue,
  },
  { unknowns: 'ignore' }
);

export const alertingV2RawRuleTemplateReadSchemaV4 = schema.object({
  engine: schema.literal('v2'),
  rule: schema.object(
    {
      kind: legacyValue,
      metadata: legacyValue,
      time_field: legacyValue,
      schedule: legacyValue,
      grouping: legacyValue,
      artifacts: legacyValue,
      recovery_strategy: legacyValue,
      no_data_strategy: legacyValue,
      query: schema.oneOf([legacyComposedQuery, legacyStandaloneQuery]),
      state_transition: schema.maybe(legacyStateTransition),
    },
    { unknowns: 'ignore' }
  ),
});

/**
 * Create/read schema for model version 4: alerting v1 or alerting v2 schema.
 */
export const rawRuleTemplateSchema = schema.oneOf([
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
]);
