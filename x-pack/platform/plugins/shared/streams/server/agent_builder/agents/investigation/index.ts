/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common/tools';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from '../discovery/constants';

export const SIGEVENTS_INVESTIGATION_CONTEXT_AGENT_ID = 'sigevents.investigation.context';
export const SIGEVENTS_INVESTIGATION_GATHER_AGENT_ID = 'sigevents.investigation.gather';
export const SIGEVENTS_INVESTIGATION_REVIEW_AGENT_ID = 'sigevents.investigation.review';
export const SIGEVENTS_INVESTIGATION_SYNTHESIS_AGENT_ID = 'sigevents.investigation.synthesis';

const investigationContextAgent = {
  id: SIGEVENTS_INVESTIGATION_CONTEXT_AGENT_ID,
  name: 'Investigation Context',
  description:
    'Reads memory and the sigevent to understand what happened, then proposes ' +
    'root cause hypotheses with prior confidence scores.',
  labels: ['observability', 'streams', 'significant-events', 'investigation', 'context'],
  configuration: {
    skill_ids: ['significant-events-memory', 'significant-events-investigation-context'],
    tools: [
      {
        tool_ids: [
          platformStreamsSigEventsTools.searchKnowledgeIndicators,
          platformCoreTools.executeEsql,
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
    skill_ids: ['significant-events-memory', 'significant-events-investigation-gather'],
    tools: [
      {
        tool_ids: [
          platformStreamsSigEventsTools.searchKnowledgeIndicators,
          platformCoreTools.executeEsql,
          OBSERVABILITY_GET_LOGS_TOOL_ID,
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
