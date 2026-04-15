/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extra headers for versioned public Agent Builder REST routes when using
 * {@link @kbn/kbn-client#KbnClient}.
 */
export const AGENT_BUILDER_PUBLIC_API_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': '2023-10-31',
} as const;
