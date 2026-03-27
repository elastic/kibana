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

/**
 * Narrows `Example['input']` from optional to required with a structured shape.
 * This is intentional: `AttackExample[]` is assignable to `Example[]` (covariant),
 * but the evaluator pipeline will always receive a populated `input`.
 */
export interface AttackExample extends Example {
  input: {
    prompt: string;
    category: AttackCategory;
    technique: string;
    description: string;
  };
  /** Expected output is not applicable for adversarial attack examples. */
  output?: undefined;
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
  /**
   * Per-module generation config passed to **all** selected modules.
   *
   * Technique names are module-specific (e.g., `'direct-override'` only exists in
   * `prompt-injection`). When running multiple modules, techniques that don't belong
   * to a module are silently skipped by that module, which may result in zero examples
   * from some modules. For precise control, run modules individually.
   */
  moduleConfig?: AttackModuleConfig;
  /** Dataset name override. Defaults to 'red-team'. */
  name?: string;
  /** Dataset description override. */
  description?: string;
}

export type RedTeamDataset = EvaluationDataset<AttackExample>;
