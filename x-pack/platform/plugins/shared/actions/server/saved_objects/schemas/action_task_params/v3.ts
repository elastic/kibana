/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionTaskParamsSchema as actionTaskParamsSchemaV2 } from './v2';

export const actionTaskParamsSchema = actionTaskParamsSchemaV2.extends({
  // UIAM's verdict on whether `apiKey` is an external (user-created Cloud) API key, captured
  // by the enqueuer from the rule's persisted `uiamApiKeyExternal`. Used to mark the execution
  // fake request so the Elasticsearch cluster client does not attach the UIAM shared secret,
  // which UIAM rejects for external keys.
  uiamApiKeyExternal: schema.maybe(schema.boolean()),
});
