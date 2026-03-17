/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example, EvaluationResult } from '../types';

export type AttackCategory =
  | 'prompt-injection'
  | 'privilege-escalation'
  | 'info-extraction'
  | 'jailbreaking';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AttackExample extends Example {
  input: {
    prompt: string;
    category: AttackCategory;
    technique: string;
    description: string;
  };
}

export interface AttackModule {
  name: string;
  category: AttackCategory;
  generate: (config?: AttackModuleConfig) => AttackExample[];
}

export interface AttackModuleConfig {
  /**
   * Restrict generation to specific techniques within the module.
   * When omitted, all techniques are included.
   */
  techniques?: string[];
  /** Additional context about the target agent (e.g. system prompt fragments, tool names). */
  targetContext?: {
    agentName?: string;
    knownTools?: string[];
    knownTopics?: string[];
  };
}

export interface AttackResult {
  example: AttackExample;
  output: unknown;
  evaluations: Record<string, EvaluationResult>;
  severity: Severity;
  passed: boolean;
  /**
   * OTel trace ID associated with the LLM interaction that produced this result.
   * When available, enables downstream consumers to correlate attack results with
   * full execution traces stored in the `kibana-evaluations` datastream.
   *
   * @see vision Section 5.2.2 — trace-first evaluation model
   */
  traceId?: string;
}

export interface RedTeamRunSummary {
  totalAttacks: number;
  passed: number;
  failed: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<AttackCategory, { total: number; passed: number; failed: number }>;
  results: AttackResult[];
}
