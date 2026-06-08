/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Example, EvaluationResult } from '../types';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface TargetContext {
  availableTools?: string[];
  systemPromptHints?: string[];
  authorizedScopes?: string[];
}

export interface AttackModuleConfig {
  count: number;
  difficulty: 'basic' | 'moderate' | 'advanced';
  templateOnly?: boolean;
  inferenceClient?: BoundInferenceClient;
  targetContext?: TargetContext;
}

export interface AttackModule {
  name: string;
  description: string;
  owaspCategory: string;
  defaultEvaluators: string[];
  generate: (config: AttackModuleConfig) => Promise<Example[]>;
}

export interface ConversationTurn {
  role: 'attacker' | 'target';
  content: string;
}

export interface SingleTurnStrategy {
  name: string;
  description: string;
  kind: 'single-turn';
  transform: (prompt: string) => string;
}

export interface MultiTurnStrategy {
  name: string;
  description: string;
  kind: 'multi-turn';
  maxTurns: number;
  generateFirstTurn: (attackPrompt: string) => string;
  generateNextTurn: (
    attackPrompt: string,
    conversationHistory: ConversationTurn[]
  ) => string | null;
}

export type Strategy = SingleTurnStrategy | MultiTurnStrategy;
export type StrategyFactory = (config?: Record<string, unknown>) => Strategy;

export interface GuardrailRule {
  name: string;
  pattern: RegExp;
  action: 'block' | 'warn' | 'log';
  severity: Severity;
  owaspCategory?: string;
  description: string;
}

export interface GuardrailConfig {
  rules: GuardrailRule[];
}

export interface GuardrailViolation {
  rule: string;
  action: 'block' | 'warn' | 'log';
  severity: Severity;
  matchedPattern: string;
  location: string;
}

export interface NamedScore {
  evaluator: string;
  score: number | null | undefined;
  label: string | null | undefined;
  explanation: string | null | undefined;
}

export interface AttackResult {
  example: Example;
  namedScores: NamedScore[];
  responseExcerpt: string;
  guardrailViolations: GuardrailViolation[];
  severity: Severity;
  owaspCategory: string;
  attackModule: string;
  strategy: string;
}

export interface RedTeamConfig {
  modules?: string[];
  strategies?: string[];
  count?: number;
  difficulty?: 'basic' | 'moderate' | 'advanced';
  templateOnly?: boolean;
  guardrails?: GuardrailConfig;
  severityThresholds?: Record<string, Severity>;
  targetContext?: TargetContext;
  /** Max number of adversarial examples to run in parallel for multi-turn strategies. Defaults to 3. */
  exampleConcurrency?: number;
  /**
   * Minimum overall pass rate (percentage 0-100) required for the red-team run to be
   * considered successful. Suites use this to fail the test when the AI assistant
   * regresses below the agreed security baseline.
   */
  minPassRate?: number;
}

export interface ModuleReport {
  module: string;
  total: number;
  passed: number;
  failed: number;
  results: AttackResult[];
  bySeverity: Record<Severity, number>;
}

export interface RedTeamReport {
  runId: string;
  suite: string;
  /** All strategies that were run in this report. */
  strategies: string[];
  /** Comma-joined strategy names for backward compatibility. */
  strategy: string;
  difficulty: string;
  templateOnly: boolean;
  modules: ModuleReport[];
  overallPassRate: number;
}
