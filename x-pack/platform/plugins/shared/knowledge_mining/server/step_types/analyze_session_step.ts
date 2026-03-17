/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { MemoryServiceImpl, SuggestionServiceImpl } from '../services';
import { analyzeSessionStepCommonDefinition } from '../../common/step_types/analyze_session_step';

interface StepDeps {
  getServices: () => {
    memoryService: MemoryServiceImpl;
    suggestionService: SuggestionServiceImpl;
  };
}

export const getAnalyzeSessionStepDefinition = ({ getServices }: StepDeps) => {
  return createServerStepDefinition({
    ...analyzeSessionStepCommonDefinition,
    handler: async (context) => {
      try {
        const { conversation_id: conversationId } = context.input;
        context.logger.debug(`knowledge-mining:analyze-session step started for ${conversationId}`);

        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        const { memoryService, suggestionService } = getServices();
        const memoryClient = memoryService.getScopedClient({ request });
        const suggestionClient = suggestionService.getScopedClient({ request });

        // Fetch existing memories for context
        const existingMemories = await memoryClient.list({ limit: 100 });

        // For now, return a placeholder — full LLM integration would use inference.chatComplete
        // to analyze the conversation and generate suggestions
        const suggestionsCreated = 0;

        return {
          output: {
            suggestions_created: suggestionsCreated,
            message: `Analyzed conversation ${conversationId}. Found ${existingMemories.length} existing memories. Created ${suggestionsCreated} suggestions.`,
          },
        };
      } catch (error) {
        context.logger.error(
          'knowledge-mining:analyze-session step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
};
