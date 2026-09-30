/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV15 } from './v15';

export const rawRuleSchema = rawRuleSchemaV15.extends({
  createdByProfileUid: schema.maybe(schema.nullable(schema.string())),
  updatedByProfileUid: schema.maybe(schema.nullable(schema.string())),
  apiKeyOwnerProfileUid: schema.maybe(schema.nullable(schema.string())),
});
