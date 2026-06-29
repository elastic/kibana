/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groundednessEvaluator } from './groundedness';
import {
  inputTokensEvaluatorDef,
  latencyEvaluatorDef,
  outputTokensEvaluatorDef,
  toolCallsEvaluatorDef,
} from './trace_metrics';
import type { EvaluatorDefinition, EvaluatorRegistry } from './types';

export const createEvaluatorRegistry = (): EvaluatorRegistry => {
  const evaluators = new Map<string, EvaluatorDefinition>([
    ['groundedness', groundednessEvaluator],
    ['latency', latencyEvaluatorDef],
    ['input_tokens', inputTokensEvaluatorDef],
    ['output_tokens', outputTokensEvaluatorDef],
    ['tool_calls', toolCallsEvaluatorDef],
  ]);

  return {
    list: () => [...evaluators.values()],
    get: (name) => evaluators.get(name),
  };
};
