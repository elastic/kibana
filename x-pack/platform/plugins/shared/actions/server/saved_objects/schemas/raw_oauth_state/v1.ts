/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawOAuthStateSchema = schema.object({
  state: schema.string(),
  codeVerifier: schema.string(),
  connectorId: schema.string(),
  redirectUri: schema.string(),
  scope: schema.maybe(schema.string()),
  kibanaReturnUrl: schema.string(), // in case of OAuth success, redirect to this URL
  createdAt: schema.string(),
  expiresAt: schema.string(),
  createdBy: schema.maybe(schema.string()),
});
