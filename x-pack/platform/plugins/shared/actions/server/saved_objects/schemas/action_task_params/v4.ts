/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionTaskParamsSchema as actionTaskParamsSchemaV3 } from './v3';

export const actionTaskParamsSchema = actionTaskParamsSchemaV3.extends({
  // Id of the UIAM API key held in `apiKey`, stored unencrypted for the same reason as
  // `apiKeyId`: the alerting API key invalidation task aggregates on it to see that a pending
  // connector execution still needs the key. Absent when the credential is an Elasticsearch key
  // or a user-created Cloud key, neither of which is looked up under this attribute.
  uiamApiKeyId: schema.maybe(schema.string()),
});
