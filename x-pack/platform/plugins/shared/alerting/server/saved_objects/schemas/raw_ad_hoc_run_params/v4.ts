/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  rawAdHocRunParamsSchema as rawAdHocRunParamsSchemaV3,
  rawAdHocRunParamsRuleSchema as rawAdHocRunParamsRuleSchemaV3,
} from './v3';

export const rawAdHocRunParamsRuleSchema = rawAdHocRunParamsRuleSchemaV3;

// UIAM API key snapshotted from the rule when the ad hoc run was scheduled. It is
// optional so legacy ad hoc run saved objects created before this field existed
// (and ES-only deployments) remain valid.
export const rawAdHocRunParamsSchema = rawAdHocRunParamsSchemaV3.extends({
  uiamApiKey: schema.maybe(schema.string()),
});
