/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { serviceSchema } from '@kbn/apm-common';
import { defineRoute } from '../types';

export interface DeleteAgentConfigurationResponse {
  result: string;
}

export const deleteAgentConfigurationRoute = defineRoute<DeleteAgentConfigurationResponse>()({
  endpoint: 'DELETE /api/apm/settings/agent-configuration 2023-10-31',
  params: z.object({
    body: z.object({
      service: serviceSchema,
    }),
  }),
});
