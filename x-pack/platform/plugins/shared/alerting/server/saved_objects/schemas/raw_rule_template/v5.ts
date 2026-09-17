/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertingV1RawRuleTemplateSchemaV4 } from './v4';

/**
 * Alerting v2 template layout, declaring the `rule.metadata` fields that model
 * version 5 mapped.
 *
 * Create-rule fields stay an opaque bag validated by Zod
 * (`ruleTemplateDataSchema`); `metadata` is spelled out only because every
 * mapped path has to appear in the latest model version's create schema, and it
 * keeps `unknowns: 'allow'` so nothing is narrowed.
 */
export const alertingV2RawRuleTemplateSchemaV5 = schema.object({
  engine: schema.literal('v2'),
  rule: schema.object(
    {
      metadata: schema.maybe(
        schema.object(
          {
            name: schema.maybe(schema.string()),
            description: schema.maybe(schema.string()),
            tags: schema.maybe(schema.arrayOf(schema.string())),
          },
          { unknowns: 'allow' }
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

/**
 * Create/read schema for model version 6: alerting v1 or alerting v2 schema.
 */
export const rawRuleTemplateSchema = schema.oneOf([
  alertingV1RawRuleTemplateSchemaV4,
  alertingV2RawRuleTemplateSchemaV5,
]);
