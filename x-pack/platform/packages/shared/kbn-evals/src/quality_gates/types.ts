/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Quality gate configuration for threshold enforcement.
 * Shared by calibration, coverage analysis, and CI gating.
 */
export interface GateConfig {
  /** Global score thresholds applied across all evaluators */
  score?: { avg: number };
  /** Per-evaluator thresholds */
  evaluators?: Record<string, { min?: number; avg?: number }>;
  /** Evaluator names that must be present in every run */
  required_pass?: string[];
  /** Minimum fraction of examples that must pass on the first attempt */
  first_try_pass_rate?: number;
}

/**
 * Serialize a GateConfig to a JSON string.
 * Uses JSON internally — no external YAML dependency.
 */
export const serializeGateConfig = (config: GateConfig): string => {
  return JSON.stringify(config, null, 2);
};

/**
 * Parse a JSON string into a validated GateConfig.
 * Throws on malformed input.
 */
export const parseGateConfig = (raw: string): GateConfig => {
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('GateConfig must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.score !== undefined) {
    if (typeof obj.score !== 'object' || obj.score === null || Array.isArray(obj.score)) {
      throw new Error('GateConfig.score must be an object with an "avg" number');
    }
    const score = obj.score as Record<string, unknown>;
    if (typeof score.avg !== 'number' || !Number.isFinite(score.avg)) {
      throw new Error('GateConfig.score.avg must be a finite number');
    }
  }

  if (obj.evaluators !== undefined) {
    if (typeof obj.evaluators !== 'object' || obj.evaluators === null) {
      throw new Error('GateConfig.evaluators must be an object');
    }
    for (const [key, value] of Object.entries(obj.evaluators as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) {
        throw new Error(`GateConfig.evaluators["${key}"] must be an object`);
      }
      const thresholds = value as Record<string, unknown>;
      if (thresholds.min !== undefined && typeof thresholds.min !== 'number') {
        throw new Error(`GateConfig.evaluators["${key}"].min must be a number`);
      }
      if (thresholds.avg !== undefined && typeof thresholds.avg !== 'number') {
        throw new Error(`GateConfig.evaluators["${key}"].avg must be a number`);
      }
    }
  }

  if (obj.required_pass !== undefined) {
    if (!Array.isArray(obj.required_pass)) {
      throw new Error('GateConfig.required_pass must be a string array');
    }
    for (const item of obj.required_pass) {
      if (typeof item !== 'string') {
        throw new Error('GateConfig.required_pass items must be strings');
      }
    }
  }

  if (obj.first_try_pass_rate !== undefined) {
    if (typeof obj.first_try_pass_rate !== 'number' || !Number.isFinite(obj.first_try_pass_rate)) {
      throw new Error('GateConfig.first_try_pass_rate must be a finite number');
    }
  }

  return parsed as GateConfig;
};
