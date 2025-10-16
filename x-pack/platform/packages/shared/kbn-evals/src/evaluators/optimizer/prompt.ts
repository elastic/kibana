/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import systemPromptText from './system_prompt.text';
import userPromptText from './user_prompt.text';

export const LlmOptimizerEvaluationPrompt = createPrompt({
  name: 'llm_optimizer_evaluation',
  description: 'Prompt for evaluating and optimizing agent system prompts and tool usage',
  input: z.object({
    user_query: z.string(),
    agent_response: z.string(),
    system_instructions: z.string().optional(),
    available_tools: z.string().optional(),
    tool_call_history: z.string().optional(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptText,
      },
    },
    template: {
      mustache: {
        template: userPromptText,
      },
    },
    toolChoice: {
      function: 'optimize',
    },
    tools: {
      optimize: {
        description:
          'Analyze agent configuration and provide optimization feedback with a satisfaction score',
        schema: {
          type: 'object',
          properties: {
            system_prompt_analysis: {
              type: 'object',
              properties: {
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of strengths in the system prompt',
                },
                weaknesses: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of weaknesses or areas for improvement',
                },
                recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific, actionable recommendations for improvement',
                },
              },
              required: ['strengths', 'weaknesses', 'recommendations'],
            },
            tool_usage_analysis: {
              type: 'object',
              properties: {
                tool_selection_quality: {
                  type: 'string',
                  description: 'Assessment of whether appropriate tools were chosen',
                },
                usage_effectiveness: {
                  type: 'string',
                  description: 'Assessment of how effectively tools were used',
                },
                missed_opportunities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of missed opportunities for better tool usage',
                },
              },
              required: ['tool_selection_quality', 'usage_effectiveness', 'missed_opportunities'],
            },
            overall_feedback: {
              type: 'string',
              description: 'A comprehensive summary of findings and key improvement areas',
            },
            satisfaction_score: {
              type: 'number',
              description:
                'Overall satisfaction score from 0 to 10, where 0 is poor and 10 is excellent',
              minimum: 0,
              maximum: 10,
            },
          },
          required: [
            'system_prompt_analysis',
            'tool_usage_analysis',
            'overall_feedback',
            'satisfaction_score',
          ],
        },
      },
    },
  } as const)
  .get();
