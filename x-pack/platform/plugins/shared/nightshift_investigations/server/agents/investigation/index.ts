/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import {
  NIGHTSHIFT_CORTEX_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
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
} from './discovery_tool_ids';
import { SANDBOX_BASH_TOOL_ID } from '../../tools/sandbox_bash/tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../../tools/sandbox_bash/view_file_tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../../tools/sandbox_bash/write_file_tool';

export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID = 'significant-events.investigation';
export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID =
  'platform.sig_events.investigation-type';

export const investigationAgentType = {
  id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
  name: 'Nightshift Investigator',
  description:
    'Investigates an observability issue by querying available signals (logs, traces, metrics), ' +
    'reasoning about causality direction, and producing a contributing-factors conclusion with supporting evidence.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions,
    skill_ids: ['significant-events-memory', 'observability.investigation', 'streams-management'],
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
          SANDBOX_BASH_TOOL_ID,
          SANDBOX_VIEW_FILE_TOOL_ID,
          SANDBOX_STR_REPLACE_TOOL_ID,
          SANDBOX_WRITE_FILE_TOOL_ID,
        ],
      },
    ],
    // Keep Elastic capabilities available while starting with no connectors. Admin-selected
    // connectors are persisted on the derived agent and merged into this allow-list.
    enable_elastic_capabilities: true,
    connector_ids: [],
    workflow_ids: [NIGHTSHIFT_CORTEX_HYDRATE_WORKFLOW_ID],
    post_execution_workflow_ids: [NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW_ID],
  },
} as const satisfies AgentTypeDefinition;

export const registerInvestigationAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(investigationAgentType);
};
