/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV6 } from './v6';
import { flappingSchema as flappingSchemaV2 } from './v2';

export const flappingSchema = flappingSchemaV2.extends({
  enabled: schema.maybe(schema.boolean()),
});

export const rawRuleSchema = rawRuleSchemaV6.extends({
  flapping: schema.maybe(schema.nullable(flappingSchema)),
});
