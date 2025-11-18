/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import { executeAsEsqlAgent, formatDocumentAnalysis } from '@kbn/ai-tools';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import type { NaturalLanguageQuery } from '../queries/types';
import { GenerateRulesPrompt } from './prompt';
import type { CreateRuleToolCall } from './types';

export async function generateRules({
  esClient,
  inferenceClient,
  logger,
  start,
  end,
  analysis,
  definition,
  signal,
  queries,
}: {
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  start: number;
  end: number;
  analysis: DocumentAnalysis;
  definition: Streams.all.Definition;
  signal: AbortSignal;
  queries: NaturalLanguageQuery[];
}): Promise<CreateRuleToolCall[]> {
  const formattedAnalysis = formatDocumentAnalysis(analysis, {
    dropEmpty: true,
    dropUnmapped: false,
  });

  const assistantResponse = await executeAsReasoningAgent({
    inferenceClient,
    prompt: GenerateRulesPrompt,
    abortSignal: signal,
    finalToolChoice: {
      function: 'suggest_rules',
    },
    maxSteps: 4,
    input: {
      stream: {
        name: definition.name,
        description: definition.description || 'No description provided.',
      },
      sample_data: JSON.stringify(formattedAnalysis),
      queries: JSON.stringify(queries),
      existing_rules: JSON.stringify([]),
    },
    toolCallbacks: {
      generate_esql: async (toolCall) => {
        const question = toolCall.function.arguments.question.trim();

        if (!question) {
          return {
            response: {
              error: 'The question parameter is required to generate ES|QL.',
              queries: [],
            },
          };
        }

        const response = await executeAsEsqlAgent({
          esClient,
          inferenceClient,
          logger,
          prompt: question,
          signal,
          start,
          end,
        });

        return {
          response: {
            content: response.content,
          },
        };
      },
      suggest_rules: async () => {
        return {
          response: {
            acknowledged: true,
          },
        };
      },
    },
  });

  const rules = assistantResponse.toolCalls
    .flatMap((toolCall) => {
      return toolCall.function.arguments.rules;
    })
    .map((ruleCreate) => {
      return {
        timestampField: '@timestamp',
        interval: '1m',
        ...ruleCreate,
      };
    });

  return rules;
}
