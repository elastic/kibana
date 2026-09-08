/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentConfiguration } from '@kbn/apm-common';
import { defineRoute } from '../types';

export interface ListAgentConfigurationsResponse {
  configurations: AgentConfiguration[];
}

export const listAgentConfigurationsRoute = defineRoute<ListAgentConfigurationsResponse>()({
  endpoint: 'GET /api/apm/settings/agent-configuration 2023-10-31',
});
