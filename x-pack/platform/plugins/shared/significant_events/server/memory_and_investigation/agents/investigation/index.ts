/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { getSignificantEventsAvailability } from '../../../routes/utils/assert_significant_events_access';
import instructions from './instructions/investigator.md.text';
import {
  OBSERVABILITY_GET_LOGS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
  OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_TRACES_TOOL_ID,
} from '../../../agent_builder/agents/discovery/constants';

export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID = 'platform.sig_events.investigation';

export function createInvestigationAgent({
  server,
}: {
  server: StreamsServer;
}): BuiltInAgentDefinition {
  return {
    id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
    name: 'Streams Investigator',
    description:
      'Investigates an observability issue by querying available signals (logs, traces, metrics), ' +
      'reasoning about causality direction, and producing a contributing-factors conclusion with supporting evidence.',
    labels: ['observability', 'streams', 'significant-events', 'investigation', 'root-cause'],
    avatar_icon: 'logoElastic',
    // Mirror the discovery/judge agents: the setup-only registration APIs cannot be driven by the
    // availability flag, so gate selection at request time through the shared availability check.
    availability: {
      cacheMode: 'space',
      handler: async () => {
        const availability = await getSignificantEventsAvailability({
          server,
          licensing: server.licensing,
        });

        return availability.available
          ? { status: 'available' }
          : { status: 'unavailable', reason: availability.reason };
      },
    },
    configuration: {
      instructions,
      skill_ids: ['significant-events-memory', 'observability.investigation'],
      tools: [
        {
          tool_ids: [
            platformSignificantEventsTools.reportInvestigationProgress,
            platformSignificantEventsTools.searchKnowledgeIndicators,
            platformCoreTools.executeEsql,
            platformCoreTools.generateEsql,
            platformCoreTools.executeWorkflow,
            platformCoreTools.getWorkflowExecutionStatus,
            OBSERVABILITY_GET_LOGS_TOOL_ID,
            OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
            OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
            OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
            OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
            OBSERVABILITY_GET_SERVICES_TOOL_ID,
            OBSERVABILITY_GET_TRACES_TOOL_ID,
          ],
        },
      ],
      // Explicit: smlSearch + executeConnectorSubAction let the agent discover and
      // invoke system connectors (e.g. source repositories) without hard-coding IDs.
      enable_elastic_capabilities: true,
    },
  } as const;
}

export const registerInvestigationAgents = ({
  agentBuilder,
  server,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  server: StreamsServer;
}): void => {
  agentBuilder.agents.register(createInvestigationAgent({ server }));
};
