/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiKey } from '@kbn/security-plugin-types-common';
import { defineRoute } from '../types';

export interface AgentKeysResponse {
  agentKeys: ApiKey[];
}

export const agentKeysRoute = defineRoute<AgentKeysResponse>()({
  endpoint: 'GET /internal/apm/agent_keys',
});
