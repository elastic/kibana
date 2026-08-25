/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeScore, LlmJudgeConfig } from '@kbn/evals-common';

export type { LlmJudgeConfig };

/** One score a judge reports, as declared by its definition. */
export type JudgeScoreDefinition = JudgeScore;

/**
 * A piece of the normalized evidence round a judge can be shown. Declaring one
 * both requires it of the trace and makes it available to the prompt template.
 */
export type JudgeEvidenceKey = LlmJudgeConfig['evidence'][number];

export const JUDGE_EVIDENCE_KEYS: readonly JudgeEvidenceKey[] = ['input', 'response', 'steps'];

/**
 * Template variable each evidence key is rendered under. Named to match the
 * built-in judge prompts, so a prompt written against one reads the same here.
 */
export const JUDGE_EVIDENCE_TEMPLATE_VARIABLES: Record<JudgeEvidenceKey, string> = {
  input: 'user_query',
  response: 'agent_response',
  steps: 'tool_calls',
};

/**
 * A stored evaluator definition, as the rest of the server sees it. The storage
 * document is the same shape plus the space assignment, which the client owns.
 */
export interface EvaluatorDefinitionDocument {
  id: string;
  name: string;
  version: string;
  kind: 'llm';
  description: string;
  judge: LlmJudgeConfig;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
