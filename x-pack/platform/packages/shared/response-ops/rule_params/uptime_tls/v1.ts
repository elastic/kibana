/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const uptimeTLSRuleParamsSchema = schema.object({
  stackVersion: schema.maybe(schema.string()),
  search: schema.maybe(schema.string()),
  certExpirationThreshold: schema.maybe(schema.number()),
  certAgeThreshold: schema.maybe(schema.number()),
});

export type UptimeTLSRuleParams = TypeOf<typeof uptimeTLSRuleParamsSchema>;
