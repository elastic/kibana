/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SIGNIFICANT_EVENTS_AGENT_RESEARCH_INSTRUCTIONS,
  SIGNIFICANT_EVENTS_AGENT_ANSWER_INSTRUCTIONS,
} from '../../agent/instructions';
import { STREAMS_TOOL_IDS } from '../../agent/tools/constants';
import { getGatherContextTool } from '../../agent/tools/gather_context';
import { getFindChangedQueriesTool } from '../../agent/tools/find_changed_queries';
import { getClusterByTimeTool } from '../../agent/tools/cluster_by_time';
import { getGroupWithinWindowTool } from '../../agent/tools/group_within_window';
import { getSampleClusterTool } from '../../agent/tools/sample_cluster';
import { getDescribeClusterTool } from '../../agent/tools/describe_cluster';
import { getGetEntityTimelineTool } from '../../agent/tools/get_entity_timeline';
import { getExploreTopologyTool } from '../../agent/tools/explore_topology';
import { getCompareToBaselineTool } from '../../agent/tools/compare_to_baseline';
import { getContextExpansionTool } from '../../agent/tools/context_expansion';
import { getEmbeddingSearchSimilarTool } from '../../agent/tools/embedding_search_similar';
import type { SignificantEventsAgentToolDependencies } from '../../agent/tool_dependencies';
import { SUBMIT_INSIGHTS_TOOL_NAME, insightsSchema } from '../client/insight_tool';

const jsonSchemaOptions = { $refStrategy: 'none' as const };

function toolSchemaFromZod<T extends z.ZodType>(schema: T): ToolSchema {
  return zodToJsonSchema(schema, jsonSchemaOptions) as unknown as ToolSchema;
}

/** Builtin stream tools expose schema and description for prompt tool definitions. */
interface StreamToolWithSchema {
  id: string;
  schema: z.ZodType;
  description: string;
}

/**
 * Builds the tool definitions for the insights agent prompt (description + schema per tool).
 * Uses the same tool IDs and schemas as the Agent Builder–registered tools so the agent
 * can be driven either by Agent Builder or by executeAsReasoningAgent.
 */
export function getInsightsAgentPromptToolDefinitions(
  deps: SignificantEventsAgentToolDependencies
): Record<string, { description: string; schema: ToolSchema }> {
  const gatherContext = getGatherContextTool(deps) as StreamToolWithSchema;
  const findChangedQueries = getFindChangedQueriesTool(deps) as StreamToolWithSchema;
  const clusterByTime = getClusterByTimeTool(deps) as StreamToolWithSchema;
  const groupWithinWindow = getGroupWithinWindowTool(deps) as StreamToolWithSchema;
  const sampleCluster = getSampleClusterTool(deps) as StreamToolWithSchema;
  const describeCluster = getDescribeClusterTool(deps) as StreamToolWithSchema;
  const getEntityTimeline = getGetEntityTimelineTool(deps) as StreamToolWithSchema;
  const exploreTopology = getExploreTopologyTool(deps) as StreamToolWithSchema;
  const compareToBaseline = getCompareToBaselineTool(deps) as StreamToolWithSchema;
  const contextExpansion = getContextExpansionTool(deps) as StreamToolWithSchema;
  const embeddingSearchSimilar = getEmbeddingSearchSimilarTool(deps) as StreamToolWithSchema;

  return {
    [STREAMS_TOOL_IDS.gather_context]: {
      description: gatherContext.description,
      schema: toolSchemaFromZod(gatherContext.schema),
    },
    [STREAMS_TOOL_IDS.find_changed_queries]: {
      description: findChangedQueries.description,
      schema: toolSchemaFromZod(findChangedQueries.schema),
    },
    [STREAMS_TOOL_IDS.cluster_by_time]: {
      description: clusterByTime.description,
      schema: toolSchemaFromZod(clusterByTime.schema),
    },
    [STREAMS_TOOL_IDS.group_within_window]: {
      description: groupWithinWindow.description,
      schema: toolSchemaFromZod(groupWithinWindow.schema),
    },
    [STREAMS_TOOL_IDS.sample_cluster]: {
      description: sampleCluster.description,
      schema: toolSchemaFromZod(sampleCluster.schema),
    },
    [STREAMS_TOOL_IDS.describe_cluster]: {
      description: describeCluster.description,
      schema: toolSchemaFromZod(describeCluster.schema),
    },
    [STREAMS_TOOL_IDS.get_entity_timeline]: {
      description: getEntityTimeline.description,
      schema: toolSchemaFromZod(getEntityTimeline.schema),
    },
    [STREAMS_TOOL_IDS.explore_topology]: {
      description: exploreTopology.description,
      schema: toolSchemaFromZod(exploreTopology.schema),
    },
    [STREAMS_TOOL_IDS.compare_to_baseline]: {
      description: compareToBaseline.description,
      schema: toolSchemaFromZod(compareToBaseline.schema),
    },
    [STREAMS_TOOL_IDS.context_expansion]: {
      description: contextExpansion.description,
      schema: toolSchemaFromZod(contextExpansion.schema),
    },
    [STREAMS_TOOL_IDS.embedding_search_similar]: {
      description: embeddingSearchSimilar.description,
      schema: toolSchemaFromZod(embeddingSearchSimilar.schema),
    },
    [platformCoreTools.executeEsql]: {
      description: `Execute an ES|QL query and return results in tabular format. Use for ad-hoc analysis when Streams tools are not sufficient.`,
      schema: toolSchemaFromZod(
        z.object({
          query: z.string().describe('The ES|QL query to execute.'),
        })
      ),
    },
    [SUBMIT_INSIGHTS_TOOL_NAME]: {
      description:
        'Submit your final list of Insights. Call exactly once when you have finished analysis. Pass an array of insights (or empty array if none). Each insight must include title, description, impact, evidence, and recommendations.',
      schema: insightsSchema,
    },
  };
}

const systemPromptTemplate = `${SIGNIFICANT_EVENTS_AGENT_RESEARCH_INSTRUCTIONS}

${SIGNIFICANT_EVENTS_AGENT_ANSWER_INSTRUCTIONS}`;

const userPromptTemplate = `Time range: {{{from}}} to {{{to}}}.
{{#stream_names}}Streams to analyze: {{{stream_names}}}.
{{/stream_names}}
Use the tools to gather context, cluster, and analyze. When you have finished, you MUST call \`${SUBMIT_INSIGHTS_TOOL_NAME}\` exactly once with your final list of Insights (or an empty array if none).`;

/**
 * Creates the prompt used by executeAsReasoningAgent for the agentic insights flow.
 * Same instructions and tools as the Agent Builder–registered Significant Events agent.
 */
export function createInsightsAgentPrompt(deps: SignificantEventsAgentToolDependencies) {
  const tools = getInsightsAgentPromptToolDefinitions(deps);

  return createPrompt({
    name: 'insights_agent',
    input: z.object({
      stream_names: z.string().optional().describe('Comma-separated stream names; omit for all.'),
      from: z.string().describe('Start of the time range (ISO 8601).'),
      to: z.string().describe('End of the time range (ISO 8601).'),
    }),
  })
    .version({
      system: {
        mustache: {
          template: systemPromptTemplate,
        },
      },
      template: {
        mustache: {
          template: userPromptTemplate,
        },
      },
      tools,
    })
    .get();
}
