/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  rawAdHocRunParamsSchema as rawAdHocRunParamsSchemaV5,
  rawAdHocRunParamsRuleSchema as rawAdHocRunParamsRuleSchemaV5,
} from './v5';

export const rawAdHocRunParamsRuleSchema = rawAdHocRunParamsRuleSchemaV5;

// Id of the snapshotted `uiamApiKey`. `uiamApiKey` itself is encrypted and therefore not
// searchable, so the API key invalidation task cannot tell that an ad hoc run still holds a
// UIAM key — mirroring `apiKeyId` for the ES key makes that check possible. Optional because
// user-created Cloud keys have no id and because ad hoc runs predating this attribute have none.
export const rawAdHocRunParamsSchema = rawAdHocRunParamsSchemaV5.extends({
  uiamApiKeyId: schema.maybe(schema.string()),
});
