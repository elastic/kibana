/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { privilegesTypeSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface CreateAgentKeyResponse {
  agentKey: SecurityCreateApiKeyResponse;
}

export const createAgentKeyRoute = defineRoute<CreateAgentKeyResponse>()({
  endpoint: 'POST /api/apm/agent_keys 2023-10-31',
  params: z.object({
    body: z.object({
      name: z.string(),
      privileges: privilegesTypeSchema,
    }),
  }),
});
