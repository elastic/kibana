/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  executeCodeEvaluator,
  executeLlmJudgeEvaluator,
  executeEsqlEvaluator,
} from '../../lib/evaluation_engine';
import type { ServerEvaluator, ServerEvaluatorParams } from '../../lib/evaluation_engine';

export const buildCustomEvaluator = (
  name: string,
  description: string,
  type: 'llm-judge' | 'code' | 'esql',
  config: Record<string, unknown>
): ServerEvaluator => {
  // Only llm-judge type uses LLM kind; code and esql are both CODE
  const kind = type === 'llm-judge' ? 'LLM' : 'CODE';

  return {
    name,
    kind,
    description,
    source: 'custom',
    evaluate: async (params: ServerEvaluatorParams) => {
      if (type === 'code') {
        const { function_body: functionBody } = config as { function_body: string };
        const result = executeCodeEvaluator(functionBody, {
          input: params.input,
          output: params.output,
          expected: params.expected,
          metadata: params.metadata,
        });
        return { evaluator: name, kind: 'CODE', ...result };
      }

      if (type === 'llm-judge') {
        if (!params.inferenceClient) {
          throw new Error('LLM judge evaluator requires an inference client');
        }
        const llmConfig = config as {
          prompt_template: string;
          scoring_mode: string;
          feedback_key: string;
        };
        const result = await executeLlmJudgeEvaluator(
          {
            promptTemplate: llmConfig.prompt_template,
            scoringMode: llmConfig.scoring_mode,
            feedbackKey: llmConfig.feedback_key,
          },
          {
            input: params.input,
            output: params.output,
            expected: params.expected,
          },
          params.inferenceClient as {
            chatComplete: (p: {
              messages: Array<{ role: string; content: string }>;
            }) => Promise<{ content?: string }>;
          }
        );
        return { evaluator: name, kind: 'LLM', ...result };
      }

      if (type === 'esql') {
        if (!params.esClient) {
          throw new Error('ES|QL evaluator requires an Elasticsearch client');
        }
        const esqlConfig = config as {
          query_template: string;
          score_expression: string;
          pass_condition: string;
        };
        const result = await executeEsqlEvaluator(
          {
            queryTemplate: esqlConfig.query_template,
            scoreExpression: esqlConfig.score_expression,
            passCondition: esqlConfig.pass_condition,
          },
          {
            input: params.input,
            output: params.output,
          },
          params.esClient as {
            esql: {
              query: (p: { query: string; format: string }) => Promise<{
                columns?: Array<{ name: string; type: string }>;
                values?: unknown[][];
              }>;
            };
          }
        );
        return { evaluator: name, kind: 'CODE', ...result };
      }

      throw new Error(`Unknown evaluator type: ${type}`);
    },
  };
};
