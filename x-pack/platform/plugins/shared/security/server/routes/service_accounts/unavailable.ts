/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The body every service accounts route answers with when the feature is not there to serve the
 * request. Shared, so the three routes cannot drift into three different messages for it.
 */
export const serviceAccountsUnavailable = (reason: string) => ({
  body: { message: `Service accounts are not available: ${reason}` },
});
