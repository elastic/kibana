/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_API_VERSION } from './constants';

/**
 * Extra headers for versioned public Agent Builder REST routes when using
 * {@link @kbn/kbn-client#KbnClient}.
 */
export const AGENT_BUILDER_PUBLIC_API_HEADERS = {
  'Content-Type': 'application/json',
  'elastic-api-version': ELASTIC_API_VERSION,
} as const;
