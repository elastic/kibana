/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createPromptLeakDetectionEvaluator } from '@kbn/evals';
import { createGuardrailsEvaluator, type GuardrailRule } from './guardrails';

export interface RedTeamEvaluatorsConfig {
  /** Custom guardrail rules. When omitted, defaults are used. */
  guardrailRules?: readonly GuardrailRule[];
  /** Custom patterns for prompt leak detection. When omitted, defaults are used. */
  promptLeakPatterns?: RegExp[];
  /** Patterns to exclude from prompt leak scanning (e.g. known-safe content). */
  promptLeakExcludePatterns?: RegExp[];
}

/**
 * Returns a set of evaluators suited for red-team adversarial testing.
 *
 * Combines:
 * - **guardrails** — scans output for credential leaks, dangerous commands, system prompt references
 * - **prompt-leak-detection** — from `@kbn/evals`, detects system prompt leakage patterns
 *
 * For agent-specific evaluators (tool poisoning, scope violation), configure and pass
 * them separately since they require per-agent knowledge (allowed tools, scope patterns).
 *
 * ```ts
 * const evaluators = getRedTeamEvaluators();
 * await executorClient.runExperiment({ dataset, task }, evaluators);
 * ```
 */
export const getRedTeamEvaluators = (config?: RedTeamEvaluatorsConfig): Evaluator[] => {
  const guardrails = createGuardrailsEvaluator(config?.guardrailRules);

  const promptLeak = createPromptLeakDetectionEvaluator({
    patterns: config?.promptLeakPatterns,
    excludePatterns: config?.promptLeakExcludePatterns,
  });

  return [guardrails, promptLeak];
};
