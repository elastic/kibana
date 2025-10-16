/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EvaluatorId {
  Relevance = 'relevance',
  Groundedness = 'groundedness',
  Recall = 'recall',
  Precision = 'precision',
  Regex = 'regex',
  Criteria = 'criteria',
  Optimizer = 'optimizer',
}

export interface Evaluator {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'number';
}

export interface EvaluatorConfig {
  evaluatorId: EvaluatorId;
  evaluatorIdOverride?: string;
  customInstructions?: string | number;
}

export interface EvaluationRunRequest {
  conversationId: string;
  evaluators: EvaluatorConfig[];
}

export interface EvaluationScore {
  evaluatorId: string;
  score: number;
}

export interface ConversationRoundEvaluation {
  roundId: string;
  scores: EvaluationScore[];
}

export interface EvaluationRunResponse {
  conversationId: string;
  results: ConversationRoundEvaluation[];
}

export interface ListEvaluatorsResponse {
  evaluators: Evaluator[];
}
