/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, OSQUERY_MAX_AGENTS_HEADER } from '../../../common/constants';
import { TARGET_AGENT_LIMIT } from '../../../common/workflows/contract/budget';

export const PUBLIC_API_HEADERS = { 'elastic-api-version': API_VERSIONS.public.v1 };
export const INTERNAL_API_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

/** Asks the live-query route to enforce the step ceiling on the agents it selects. */
export const DISPATCH_API_HEADERS = {
  ...PUBLIC_API_HEADERS,
  [OSQUERY_MAX_AGENTS_HEADER]: String(TARGET_AGENT_LIMIT),
};
