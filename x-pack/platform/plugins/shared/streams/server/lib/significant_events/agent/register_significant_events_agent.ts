/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server/types';
import { SIGNIFICANT_EVENTS_AGENT_ID } from '../../../../common/constants';
import {
  SIGNIFICANT_EVENTS_AGENT_ANSWER_INSTRUCTIONS,
  SIGNIFICANT_EVENTS_AGENT_RESEARCH_INSTRUCTIONS,
} from './instructions';
import type { SignificantEventsAgentToolDependencies } from './tool_dependencies';
import {
  STREAMS_TOOL_IDS,
  getFindChangedQueriesTool,
  getClusterByTimeTool,
  getGroupWithinWindowTool,
  getSampleClusterTool,
  getDescribeClusterTool,
  getGetEntityTimelineTool,
  getExploreTopologyTool,
  getCompareToBaselineTool,
  getContextExpansionTool,
  getEmbeddingSearchSimilarTool,
} from './tools';

const SIGNIFICANT_EVENTS_AGENT_TOOL_IDS = [
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.productDocumentation,
  STREAMS_TOOL_IDS.find_changed_queries,
  STREAMS_TOOL_IDS.cluster_by_time,
  STREAMS_TOOL_IDS.group_within_window,
  STREAMS_TOOL_IDS.sample_cluster,
  STREAMS_TOOL_IDS.describe_cluster,
  STREAMS_TOOL_IDS.get_entity_timeline,
  STREAMS_TOOL_IDS.explore_topology,
  STREAMS_TOOL_IDS.compare_to_baseline,
  STREAMS_TOOL_IDS.context_expansion,
  STREAMS_TOOL_IDS.embedding_search_similar,
] as const;

/**
 * Registers the Significant Events agent with Agent Builder.
 * The agent uses platform core tools to analyze alert streams and produce actionable insights.
 * @param agentBuilder - Agent Builder plugin setup
 * @param deps - Dependencies (e.g. getScopedClients) so tool handlers can access Streams plugin clients
 */
export function registerSignificantEventsAgent(
  agentBuilder: AgentBuilderPluginSetup,
  deps: SignificantEventsAgentToolDependencies
): void {
  agentBuilder.tools.register(getFindChangedQueriesTool(deps));
  agentBuilder.tools.register(getClusterByTimeTool(deps));
  agentBuilder.tools.register(getGroupWithinWindowTool(deps));
  agentBuilder.tools.register(getSampleClusterTool(deps));
  agentBuilder.tools.register(getDescribeClusterTool(deps));
  agentBuilder.tools.register(getGetEntityTimelineTool(deps));
  agentBuilder.tools.register(getExploreTopologyTool(deps));
  agentBuilder.tools.register(getCompareToBaselineTool(deps));
  agentBuilder.tools.register(getContextExpansionTool(deps));
  agentBuilder.tools.register(getEmbeddingSearchSimilarTool(deps));

  agentBuilder.agents.register({
    id: SIGNIFICANT_EVENTS_AGENT_ID,
    name: 'Significant Events Agent',
    description:
      'Agent specialized in triaging alert streams and identifying root causes of system issues',
    avatar_icon: 'logstashQueue',
    configuration: {
      research: {
        instructions: SIGNIFICANT_EVENTS_AGENT_RESEARCH_INSTRUCTIONS,
      },
      answer: {
        instructions: SIGNIFICANT_EVENTS_AGENT_ANSWER_INSTRUCTIONS,
      },
      tools: [
        {
          tool_ids: [...SIGNIFICANT_EVENTS_AGENT_TOOL_IDS],
        },
      ],
    },
  });
}
