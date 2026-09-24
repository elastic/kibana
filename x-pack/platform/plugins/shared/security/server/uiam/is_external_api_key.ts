/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';

/** Identifies external API keys using explicit metadata from the authenticated user. */
export const isExternalApiKey = (user: AuthenticatedUser | null): boolean => {
  // Missing metadata must not disable UIAM client authentication: session tokens and fake
  // requests carrying internally granted keys still require Kibana's shared secret or certificate.
  return user?.api_key?.internal === false;
};
