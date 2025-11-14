/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EVALUATOR_NAMES = {
  INPUT_TOKENS: 'Input Tokens',
  OUTPUT_TOKENS: 'Output Tokens',
  CACHED_TOKENS: 'Cached Tokens',
  TOOL_CALLS: 'Tool Calls',
  LATENCY: 'Latency',
  CORRECTNESS: 'Correctness',
  GROUNDEDNESS: 'Groundedness',
} as const;

export const TOKEN_EVALUATORS = [
  EVALUATOR_NAMES.INPUT_TOKENS,
  EVALUATOR_NAMES.OUTPUT_TOKENS,
  EVALUATOR_NAMES.CACHED_TOKENS,
] as const;
