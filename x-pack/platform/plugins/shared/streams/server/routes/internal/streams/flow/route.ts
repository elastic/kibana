/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
// Inlined to avoid importing @kbn/fleet-plugin/* which pulls packages outside rootDir
const AGENT_POLICY_SAVED_OBJECT_TYPE = 'ingest-agent-policies';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { FlowGraphPayload, FlowThroughputPayload } from '../../../../../common/flow';
import { createServerRoute } from '../../../create_server_route';
import { cloudPipelinesRoutes } from './cloud_pipelines_routes';
import { prometheusRoutes } from './prometheus_routes';
import {
  getDocCountsForStreams,
  getFailedDocCountsForStreams,
} from '../../../streams/doc_counts/get_streams_doc_counts';
import {
  assembleFlowGraphPayload,
  assembleFlowThroughputPayload,
} from '../../../../lib/streams/flow/assemble_flow_graph';
import type { StreamDocsStat } from '../../../../../common';

const FLOW_WINDOW_SECONDS = 5 * 60; // 5 minutes

export const flowGraphRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/graph',
  options: {
    access: 'internal',
  },
  params: z.object({}),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ getScopedClients, request, server }): Promise<FlowGraphPayload> => {
    const now = Date.now();
    const start = now - FLOW_WINDOW_SECONDS * 1000;
    const end = now;

    const {
      streamsClient,
      scopedClusterClient,
      soClient,
      isSecurityEnabled,
      fleetAgentClient,
      fleetAgentPolicyService,
      cloudPipelinesMock,
      prometheusMock,
    } = await getScopedClients({ request });

    const esClient = scopedClusterClient.asCurrentUser;
    const esClientAsSecondaryAuthUser = isSecurityEnabled
      ? scopedClusterClient.asSecondaryAuthUser
      : undefined;

    // Fetch stream topology
    const streamsWithExistence = await streamsClient.listStreamsWithDataStreamExistence();
    const streamNames = streamsWithExistence.map(({ stream }) => stream.name);

    // Fleet data — fully optional, all Fleet calls wrapped in try/catch
    let fleetAvailable = false;
    let agents: Parameters<typeof assembleFlowGraphPayload>[0]['agents'] = [];
    let agentPolicies: Parameters<typeof assembleFlowGraphPayload>[0]['agentPolicies'] = [];

    if (fleetAgentClient && fleetAgentPolicyService) {
      try {
        const [agentsResult, agentPoliciesResult] = await Promise.all([
          fleetAgentClient.listAgents({
            showAgentless: true,
            showInactive: false,
            perPage: 1000,
          }),
          fleetAgentPolicyService.list(soClient, {
            perPage: 1000,
          }),
        ]);

        agents = agentsResult.agents as typeof agents;
        agentPolicies = agentPoliciesResult.items as typeof agentPolicies;
        fleetAvailable = true;
      } catch {
        // Fleet errors are non-fatal; graph renders with empty agent sections
        fleetAvailable = false;
        agents = [];
        agentPolicies = [];
      }
    }

    // Agentless policies fetched separately to avoid kuery parsing issues on older Fleet versions
    if (fleetAvailable && fleetAgentPolicyService) {
      try {
        const agentlessResult = await fleetAgentPolicyService.list(soClient, {
          kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.supports_agentless: true`,
          perPage: 1000,
        });
        // Merge agentless policies into the list (avoid duplicates by id)
        const existingIds = new Set(agentPolicies.map((p) => p.id));
        for (const p of agentlessResult.items) {
          if (!existingIds.has(p.id)) {
            agentPolicies = [...agentPolicies, p as (typeof agentPolicies)[0]];
          }
        }
      } catch {
        // Non-fatal — agentless section will just be empty
      }
    }

    // Real stream metrics + mock sources — run in parallel
    const [
      streamDocCounts,
      streamFailedCounts,
      cloudPipelines,
      cloudPipelineMetrics,
      prometheusScrapers,
      prometheusMetrics,
    ] = await Promise.all([
      getDocCountsForStreams({
        isServerless: server.isServerless,
        esClient,
        esClientAsSecondaryAuthUser,
      }).catch((): StreamDocsStat[] => []),
      getFailedDocCountsForStreams({ esClient, start, end }).catch((): StreamDocsStat[] => []),
      cloudPipelinesMock.list(),
      cloudPipelinesMock.getMetrics(now, streamNames),
      prometheusMock.list(),
      prometheusMock.getMetrics(now),
    ]);

    return assembleFlowGraphPayload({
      streams: streamsWithExistence,
      streamDocCounts,
      streamFailedCounts,
      windowSeconds: FLOW_WINDOW_SECONDS,
      agents,
      agentPolicies,
      cloudPipelines,
      cloudPipelineMetrics,
      prometheusScrapers,
      prometheusMetrics,
      fleetAvailable,
      now,
    });
  },
});

export const flowThroughputRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_flow/throughput',
  options: {
    access: 'internal',
  },
  params: z.object({}),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ getScopedClients, request, server }): Promise<FlowThroughputPayload> => {
    const now = Date.now();
    const start = now - FLOW_WINDOW_SECONDS * 1000;
    const end = now;

    const {
      streamsClient,
      scopedClusterClient,
      isSecurityEnabled,
      cloudPipelinesMock,
      prometheusMock,
    } = await getScopedClients({ request });

    const esClient = scopedClusterClient.asCurrentUser;
    const esClientAsSecondaryAuthUser = isSecurityEnabled
      ? scopedClusterClient.asSecondaryAuthUser
      : undefined;

    const streamsWithExistence = await streamsClient.listStreamsWithDataStreamExistence();
    const streamNames = streamsWithExistence.map(({ stream }) => stream.name);

    const [
      streamDocCounts,
      streamFailedCounts,
      cloudPipelines,
      cloudPipelineMetrics,
      prometheusScrapers,
      prometheusMetrics,
    ] = await Promise.all([
      getDocCountsForStreams({
        isServerless: server.isServerless,
        esClient,
        esClientAsSecondaryAuthUser,
      }).catch((): StreamDocsStat[] => []),
      getFailedDocCountsForStreams({ esClient, start, end }).catch((): StreamDocsStat[] => []),
      cloudPipelinesMock.list(),
      cloudPipelinesMock.getMetrics(now, streamNames),
      prometheusMock.list(),
      prometheusMock.getMetrics(now),
    ]);

    return assembleFlowThroughputPayload({
      streams: streamsWithExistence,
      streamDocCounts,
      streamFailedCounts,
      windowSeconds: FLOW_WINDOW_SECONDS,
      cloudPipelines,
      cloudPipelineMetrics,
      prometheusScrapers,
      prometheusMetrics,
      now,
    });
  },
});

export const flowRoutes = {
  ...flowGraphRoute,
  ...flowThroughputRoute,
  ...cloudPipelinesRoutes,
  ...prometheusRoutes,
};
