/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AgentConfiguration } from '@kbn/apm-common';
import { serviceSchema } from '@kbn/apm-common';
import { defineRoute } from '../types';

export type GetSingleAgentConfigurationResponse = AgentConfiguration;

export const getSingleAgentConfigurationRoute = defineRoute<GetSingleAgentConfigurationResponse>()({
  endpoint: 'GET /api/apm/settings/agent-configuration/view 2023-10-31',
  params: z.object({
    query: serviceSchema.optional(),
  }),
});
