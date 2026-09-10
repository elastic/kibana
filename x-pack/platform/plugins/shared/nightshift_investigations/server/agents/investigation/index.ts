/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { SIGNIFICANT_EVENTS_SANDBOX_SEED_WORKFLOW_ID } from '@kbn/workflows/managed';
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

export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID = 'significant-events.investigation';
export const SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID =
  'platform.sig_events.investigation-type';

/** Builds the investigation agent type definition. When the sandbox is enabled,
 * the sandbox-seed pre-execution workflow is wired to the agent via `workflow_ids`
 * on the base configuration so it runs before every agent turn without requiring
 * an admin to configure it on the persisted agent document. */
export const getInvestigationAgentType = ({
  sandboxEnabled,
}: {
  sandboxEnabled: boolean;
}): AgentTypeDefinition => ({
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
        ],
      },
    ],
    // Keep Elastic capabilities available while starting with no connectors. Admin-selected
    // connectors are persisted on the derived agent and merged into this allow-list.
    enable_elastic_capabilities: true,
    connector_ids: [],
    // Wire the sandbox-seed workflow when the sandbox is configured. This runs as a
    // pre-execution workflow before every agent turn, seeding /workspace on the first round.
    // Conditional: without sandbox config the step throws, which would abort every
    // investigation round.
    ...(sandboxEnabled ? { workflow_ids: [SIGNIFICANT_EVENTS_SANDBOX_SEED_WORKFLOW_ID] } : {}),
  },
});

/** @deprecated Use `getInvestigationAgentType` instead. Kept for backwards-compatible access
 * to the type definition in tests and code that doesn't need the sandbox flag. */
export const investigationAgentType = getInvestigationAgentType({ sandboxEnabled: false });

export const registerInvestigationAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  { sandboxEnabled }: { sandboxEnabled: boolean } = { sandboxEnabled: false }
): void => {
  agentBuilder.agents.registerType(getInvestigationAgentType({ sandboxEnabled }));
};
