/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertingV1RawRuleTemplateSchemaV4 } from './v4';

/**
 * Alerting v1 / Fleet (`.es-query`) template layout. Unchanged from model version 4.
 */
export const alertingV1RawRuleTemplateSchemaV5 = alertingV1RawRuleTemplateSchemaV4;

/**
 * Alerting v2 template layout.
 *
 * `rule` stays opaque so the SO schema does not duplicate `@kbn/alerting-v2-schemas`
 * create-rule validation, which is owned by Zod (`ruleTemplateDataSchema`). Only the
 * `rule.metadata` paths that model version 5 adds to the index mappings are declared,
 * because the saved object checks require every mapped path to also appear in the
 * `create` schema.
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
 * Create/read schema for model version 5: alerting v1 or alerting v2 schema.
 */
export const rawRuleTemplateSchema = schema.oneOf([
  alertingV1RawRuleTemplateSchemaV5,
  alertingV2RawRuleTemplateSchemaV5,
]);
