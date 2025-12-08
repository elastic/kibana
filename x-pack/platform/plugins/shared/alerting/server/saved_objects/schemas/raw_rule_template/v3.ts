/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV2 } from './v2';

const investigationGuideSchema = schema.object({
  blob: schema.maybe(schema.string()),
});

const artifactsSchema = schema.object({
  dashboards: schema.maybe(schema.arrayOf(schema.string())),
  investigation_guide: schema.maybe(investigationGuideSchema),
});

export const rawRuleTemplateSchema = rawRuleTemplateSchemaV2.extends({
  description: schema.maybe(schema.string()),
  artifacts: schema.maybe(artifactsSchema),
});