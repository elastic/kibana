/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV6, artifactsSchema as artifactsSchemaV6 } from './v6';

export const rawRuleInvestigationGuideSchema = schema.object({
  blob: schema.string(),
});

export const artifactsSchema = artifactsSchemaV6.extends({
  rules: schema.maybe(schema.arrayOf(schema.object({ refId: schema.string() }))),
});

export const rawRuleSchema = rawRuleSchemaV6.extends({
  artifacts: schema.maybe(artifactsSchema),
  internal: schema.maybe(schema.boolean()),
});
