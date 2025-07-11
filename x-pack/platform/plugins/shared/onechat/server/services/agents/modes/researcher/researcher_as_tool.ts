/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import { runResearcherAgent } from './run_researcher_agent';

const researcherSchema = z.object({
  instructions: z.string().describe('Research instructions for the agent'),
});

export interface ResearcherResponse {
  answer: string;
}

export const researcherTool = (): BuiltinToolDefinition<typeof researcherSchema, ResearcherResponse> => {
  return {
    id: builtinToolIds.researcherAgent,
    description: `An agentic researcher tool to perform search and analysis tasks.

      Can be used to perform "deep search" tasks where a single query or search is not enough
      and where we need some kind of more in depth-research with multiple search requests and analysis.

      Example where the agent should be used:
        - "Summarize the changes between our previous and current work from home policy"
        - "Find the vulnerabilities involved in our latest alerts and gather information about them"
        - Any time the user explicitly asks to use this tool

      Example where the agent should not be used (in favor of more simple search tools):
        - "Show me the last 5 documents in the index 'foo'"
        - "Show me my latest alerts"

      Notes:
        - Please include all useful information in the instructions, as the agent has no other context. `,
    schema: researcherSchema,
    handler: async ({ instructions }, context) => {
      const searchAgentResult = await runResearcherAgent(
        {
          nextInput: { message: instructions },
        },
        context
      );

      return {
        result: { answer: searchAgentResult.round.response.message },
      };
    },
    meta: {
      tags: [builtinTags.retrieval],
    },
  };
};
