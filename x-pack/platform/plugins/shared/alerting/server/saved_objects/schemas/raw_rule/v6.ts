/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV5, artifactsSchema as artifactsSchemaV5 } from './v5';

export const rawRuleInvestigationGuideSchema = schema.object({
  blob: schema.string(),
});

export const artifactsSchema = artifactsSchemaV5.extends({
  investigation_guide: schema.maybe(rawRuleInvestigationGuideSchema),
});

export const rawRuleSchema = rawRuleSchemaV5.extends({
  artifacts: schema.maybe(artifactsSchema),
});
