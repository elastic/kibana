/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example, EvaluationDataset } from '@kbn/evals';

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
  techniques?: string[];
}

/**
 * Configuration for building a red-team evaluation dataset.
 *
 * Used with {@link createRedTeamDataset} to produce an `EvaluationDataset<AttackExample>`
 * compatible with `executorClient.runExperiment()`.
 */
export interface RedTeamDatasetConfig {
  /** Restrict to specific attack modules by name. When omitted, all modules run. */
  modules?: string[];
  /** Per-module generation config (technique filtering). */
  moduleConfig?: AttackModuleConfig;
  /** Dataset name override. Defaults to 'red-team'. */
  name?: string;
  /** Dataset description override. */
  description?: string;
}

export type RedTeamDataset = EvaluationDataset<AttackExample>;
