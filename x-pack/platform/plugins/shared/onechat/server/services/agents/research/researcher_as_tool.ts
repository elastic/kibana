/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RegisteredTool } from '@kbn/onechat-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { runSearchAgent } from './run_researcher_agent';

const researcherSchema = z.object({
  instructions: z.string().describe('Instructions for the researcher'),
});

export interface ResearcherResponse {
  answer: string;
}

export const researcherTool = (): RegisteredTool<typeof researcherSchema, ResearcherResponse> => {
  return {
    id: 'researcher',
    description: 'An agentic researcher agent to perform search tasks',
    schema: researcherSchema,
    handler: async ({ instructions }, { toolProvider, request, modelProvider, runner, logger }) => {
      const searchAgentResult = await runSearchAgent(
        {
          instructions,
          toolProvider,
        },
        { request, modelProvider, runner, logger }
      );

      return {
        answer: searchAgentResult.answer,
      };
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};
