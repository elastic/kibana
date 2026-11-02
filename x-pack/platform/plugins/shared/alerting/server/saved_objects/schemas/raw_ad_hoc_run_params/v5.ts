/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  rawAdHocRunParamsSchema as rawAdHocRunParamsSchemaV4,
  rawAdHocRunParamsRuleSchema as rawAdHocRunParamsRuleSchemaV4,
} from './v4';

export const rawAdHocRunParamsRuleSchema = rawAdHocRunParamsRuleSchemaV4;

// UIAM's verdict on whether `uiamApiKey` is an external (user-created Cloud) API key, snapshotted
// from the rule when the ad hoc run was scheduled. External keys must not be presented to
// Elasticsearch with the UIAM shared secret, so backfill runs mark their fake request accordingly.
// Absent for framework-granted keys and for ad hoc runs predating this attribute, both of which
// keep the internal-key treatment.
export const rawAdHocRunParamsSchema = rawAdHocRunParamsSchemaV4.extends({
  uiamApiKeyExternal: schema.maybe(schema.boolean()),
});
