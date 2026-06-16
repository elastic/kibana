/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common/tools';
import {
  OBSERVABILITY_GET_LOGS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
  OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_TRACES_TOOL_ID,
  OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_HOSTS_TOOL_ID,
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
  OBSERVABILITY_GET_APM_CORRELATIONS_TOOL_ID,
} from '../discovery/constants';

export const SIGEVENTS_INVESTIGATION_CONTEXT_AGENT_ID = 'sigevents.investigation.context';
export const SIGEVENTS_INVESTIGATION_GATHER_AGENT_ID = 'sigevents.investigation.gather';
export const SIGEVENTS_INVESTIGATION_REVIEW_AGENT_ID = 'sigevents.investigation.review';
export const SIGEVENTS_INVESTIGATION_SYNTHESIS_AGENT_ID = 'sigevents.investigation.synthesis';

const ALL_OBSERVABILITY_TOOL_IDS = [
  OBSERVABILITY_GET_LOGS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
  OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
  OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
  OBSERVABILITY_GET_LOG_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_TRACES_TOOL_ID,
  OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
  OBSERVABILITY_GET_SERVICES_TOOL_ID,
  OBSERVABILITY_GET_HOSTS_TOOL_ID,
  OBSERVABILITY_GET_ANOMALY_DETECTION_JOBS_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_ALERTS_TOOL_ID,
  OBSERVABILITY_GET_METRIC_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_TRACE_CHANGE_POINTS_TOOL_ID,
  OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
  OBSERVABILITY_GET_APM_CORRELATIONS_TOOL_ID,
] as const;

const investigationContextAgent = {
  id: SIGEVENTS_INVESTIGATION_CONTEXT_AGENT_ID,
  name: 'Investigation Context',
  description:
    'Reads memory and the sigevent to understand what happened, then proposes ' +
    'root cause hypotheses with prior confidence scores.',
  labels: ['observability', 'streams', 'significant-events', 'investigation', 'context'],
  configuration: {
    skill_ids: [
      'significant-events-memory',
      'significant-events-investigation-context',
      'observability.investigation',
    ],
    tools: [
      {
        tool_ids: [
          platformStreamsSigEventsTools.searchKnowledgeIndicators,
          platformCoreTools.executeEsql,
          platformCoreTools.generateEsql,
          ...ALL_OBSERVABILITY_TOOL_IDS,
        ],
      },
    ],
  },
} as const satisfies BuiltInAgentDefinition;

const investigationGatherAgent = {
  id: SIGEVENTS_INVESTIGATION_GATHER_AGENT_ID,
  name: 'Hypothesis Evidence Gatherer',
  description:
    'Collects raw evidence for a single hypothesis via ES|QL, memory, KIs, and MCP ' +
    'tools. Does not render a verdict — records what was found and what was blocked.',
  labels: ['observability', 'streams', 'significant-events', 'investigation', 'gather'],
  configuration: {
    skill_ids: [
      'significant-events-memory',
      'significant-events-investigation-gather',
      'observability.investigation',
    ],
    tools: [
      {
        tool_ids: [
          platformStreamsSigEventsTools.searchKnowledgeIndicators,
          platformCoreTools.executeEsql,
          platformCoreTools.generateEsql,
          ...ALL_OBSERVABILITY_TOOL_IDS,
        ],
      },
    ],
  },
} as const satisfies BuiltInAgentDefinition;

const investigationReviewAgent = {
  id: SIGEVENTS_INVESTIGATION_REVIEW_AGENT_ID,
  name: 'Hypothesis Evidence Reviewer',
  description:
    'Reviews gathered evidence for a single hypothesis. Verdicts it and decides ' +
    'whether to forward to synthesis or discard as uninformative.',
  labels: ['observability', 'streams', 'significant-events', 'investigation', 'review'],
  configuration: {
    skill_ids: ['significant-events-investigation-review'],
    tools: [],
  },
} as const satisfies BuiltInAgentDefinition;

const investigationSynthesisAgent = {
  id: SIGEVENTS_INVESTIGATION_SYNTHESIS_AGENT_ID,
  name: 'Investigation Synthesis',
  description:
    'Ranks forwarded hypotheses, produces the final root cause and remediation options, ' +
    'records discarded hypotheses, writes lessons to memory, returns InvestigationResult.',
  labels: ['observability', 'streams', 'significant-events', 'investigation', 'synthesis'],
  configuration: {
    skill_ids: ['significant-events-memory', 'significant-events-investigation-synthesis'],
    tools: [],
  },
} as const satisfies BuiltInAgentDefinition;

export const registerInvestigationAgents = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.register(investigationContextAgent);
  agentBuilder.agents.register(investigationGatherAgent);
  agentBuilder.agents.register(investigationReviewAgent);
  agentBuilder.agents.register(investigationSynthesisAgent);
};
