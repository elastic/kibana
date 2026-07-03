/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runLlmJudge } from '../llm_judge';
import type { EvaluatorDefinition } from '../types';
import { IncompleteGroundednessEvidenceError, extractGroundednessEvidence } from './extractor';
import { LlmGroundednessEvaluationPrompt } from './prompt';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';

export const groundednessEvaluator: EvaluatorDefinition = {
  name: 'groundedness',
  version: '1.0.0',
  kind: 'llm',
  description: 'Measures whether the response is grounded in tool-call outputs from the trace.',
  async evaluate({ trace, inferenceClient, log }) {
    if (!inferenceClient) {
      throw new Error('Inference client is required for groundedness evaluator');
    }

    let evidence;
    try {
      evidence = await extractGroundednessEvidence(trace, log);
    } catch (error) {
      if (error instanceof IncompleteGroundednessEvidenceError) {
        return {
          scores: [
            {
              name: 'groundedness',
              label: 'potentially_incomplete',
              metadata: {
                incomplete: true,
              },
            },
          ],
        };
      }

      throw error;
    }

    const analysis = await runLlmJudge<GroundednessAnalysis>({
      inferenceClient,
      prompt: LlmGroundednessEvaluationPrompt,
      toolName: 'analyze',
      input: {
        user_query: evidence.user_query,
        agent_response: evidence.agent_response,
        tool_call_history: JSON.stringify(evidence.tool_call_history),
      },
    });

    return {
      scores: [
        {
          name: 'groundedness',
          score: calculateGroundednessScore(analysis),
          label: analysis.summary_verdict,
          explanation: analysis.summary_verdict,
          metadata: {
            ...analysis,
          },
        },
      ],
    };
  },
};
