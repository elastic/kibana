/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';

export interface InvalidateAgentKeyResponse {
  invalidatedAgentKeys: string[];
}

export const invalidateAgentKeyRoute = defineRoute<InvalidateAgentKeyResponse>()({
  endpoint: 'POST /internal/apm/api_key/invalidate',
  params: z.object({
    body: z.object({ id: z.string() }),
  }),
});
