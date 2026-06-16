/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AgentName,
  ElasticApmAgentLatestVersion,
  OtelAgentLatestVersion,
} from '@kbn/apm-types';
import { defineRoute } from '../types';

type AgentLatestVersions = Record<AgentName, ElasticApmAgentLatestVersion | OtelAgentLatestVersion>;

export interface AgentLatestVersionsResponse {
  data: AgentLatestVersions;
  error?: { message: string; type?: string; statusCode?: string };
}

export const latestAgentVersionsRoute = defineRoute<AgentLatestVersionsResponse>()({
  endpoint: 'GET /internal/apm/get_latest_agent_versions',
});
