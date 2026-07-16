/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SearchHit } from '@kbn/es-types';
import type { AgentConfiguration } from '@kbn/apm-common';
import { serviceSchema } from '@kbn/apm-common';
import { defineRoute } from '../types';

const searchParamsSchema = z.object({ service: serviceSchema }).extend({
  etag: z.string().optional(),
  mark_as_applied_by_agent: z.boolean().optional(),
  error: z.string().optional(),
});

export type AgentConfigSearchParams = z.infer<typeof searchParamsSchema>;

export type SearchAgentConfigurationResponse = SearchHit<
  AgentConfiguration,
  undefined,
  undefined
> | null;

export const searchAgentConfigurationRoute = defineRoute<SearchAgentConfigurationResponse>()({
  endpoint: 'POST /api/apm/settings/agent-configuration/search 2023-10-31',
  params: z.object({
    body: searchParamsSchema,
  }),
});
