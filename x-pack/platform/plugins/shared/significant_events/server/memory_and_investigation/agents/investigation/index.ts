/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
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

export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID = 'significant_events.investigation';
export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID =
  'platform.sig_events.investigation-type';

export const investigationAgentType = {
  id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
  name: 'Streams Investigator',
  description:
    'Investigates an observability issue by querying available signals (logs, traces, metrics), ' +
    'reasoning about causality direction, and producing a contributing-factors conclusion with supporting evidence.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
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
    // Keep Elastic capabilities available while starting with no connectors. Admin-selected
    // connectors are persisted on the derived agent and merged into this allow-list.
    enable_elastic_capabilities: true,
    connector_ids: [],
  },
} as const satisfies AgentTypeDefinition;

export const registerInvestigationAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(investigationAgentType);
};
