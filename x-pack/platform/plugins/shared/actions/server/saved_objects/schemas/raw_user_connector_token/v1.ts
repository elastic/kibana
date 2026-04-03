/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawUserConnectorTokenSchema = schema.object({
  profileUid: schema.string(),
  connectorId: schema.string(),
  credentialType: schema.string(),
  credentials: schema.string({ defaultValue: '{}' }),
  expiresAt: schema.maybe(schema.string()),
  refreshTokenExpiresAt: schema.maybe(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
