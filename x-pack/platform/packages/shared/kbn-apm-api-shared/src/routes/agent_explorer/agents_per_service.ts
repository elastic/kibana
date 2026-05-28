/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { AgentName } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, probabilityRt } from '../../default_api_types';

export interface AgentExplorerAgentsResponse {
  items: Array<{
    agentDocsPageUrl: string | undefined;
    serviceName: string;
    environments: string[];
    agentName: AgentName;
    agentVersion: string[];
    agentTelemetryAutoVersion: string[];
    instances: number;
    latestVersion?: string;
  }>;
}

export const agentsPerServiceRoute = defineRoute<AgentExplorerAgentsResponse>()({
  endpoint: 'GET /internal/apm/get_agents_per_service',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      probabilityRt,
      t.partial({
        serviceName: t.string,
        agentLanguage: t.string,
      }),
    ]),
  }),
});
