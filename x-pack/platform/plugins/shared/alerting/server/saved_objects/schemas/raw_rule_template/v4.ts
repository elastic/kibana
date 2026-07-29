/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleTemplateSchema as rawRuleTemplateSchemaV3 } from './v3';

export const rawRuleTemplateSchema = rawRuleTemplateSchemaV3.extends({
  engine: schema.maybe(schema.string()),
});
