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
 * Create/read schema for model version 4: alerting v1 or alerting v2 schema.
 */
export const rawRuleTemplateSchema = schema.oneOf([
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV4,
]);
