/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawConnectorTokenSchema = schema.object({
  createdAt: schema.string(),
  connectorId: schema.string(),
  expiresAt: schema.maybe(schema.string()), // turned into an optional field
  token: schema.string(),
  tokenType: schema.string(),
  updatedAt: schema.string(),
  // added optional fields
  refreshToken: schema.maybe(schema.string()),
  refreshTokenExpiresAt: schema.maybe(schema.string()),
});
