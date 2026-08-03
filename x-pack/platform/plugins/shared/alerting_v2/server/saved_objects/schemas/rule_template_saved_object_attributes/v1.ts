/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Saved object attributes for an alerting v2 rule template.
 *
 * Intentionally separate from `@kbn/alerting-v2-schemas` Zod API schemas.
 * Create-rule fields live under `rule` as an opaque bag so the SO schema does
 * not duplicate create-rule validation; Zod owns full validation of `rule`.
 */
export const ruleTemplateSavedObjectAttributesSchema = schema.object({
  engine: schema.literal('v2'),
  rule: schema.object({}, { unknowns: 'allow' }),
});
