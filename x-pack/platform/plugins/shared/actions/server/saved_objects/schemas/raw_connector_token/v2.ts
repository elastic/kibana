/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawConnectorTokenSchema as rawConnectorTokenSchemaV1 } from './v1';

export const rawConnectorTokenSchema = rawConnectorTokenSchemaV1.extends({
  expiresAt: schema.maybe(schema.string()), // turned into an optional field
  refreshToken: schema.maybe(schema.string()),
  refreshTokenExpiresAt: schema.maybe(schema.string()),
});
