/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawConnectorSchema as rawConnectorSchemaV3 } from './v3';

export const rawConnectorSchema = rawConnectorSchemaV3.extends({
  // Unencrypted. `apiKey` / `uiamApiKey` are stripped on a normal saved-object get,
  // so GET and list cannot use them to tell whether inbound identity was stored.
  hasInboundEventIdentity: schema.maybe(schema.boolean()),
});
