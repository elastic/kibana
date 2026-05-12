/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ProposedSkillDocument,
  ConvergenceConfig,
  ConvergenceIteration,
  SkillEvaluatorResult,
} from './types';
import type { EvaluatorRegistry, ServerEvaluatorResult } from '../evaluation_engine';
import { createEvaluationRunner } from '../evaluation_engine';

export interface InferenceClient {
  chatComplete: (params: {
    messages: Array<{ role: string; content: string }>;
  }) => Promise<{ content?: string }>;
}

// ─── Inlined scoring types/functions (from @kbn/evals-extensions, devOnly) ───

interface CompositeScoreConfig {
  weights: Record<string, number>;
  dimensions: Record<string, string[]>;
}

interface CompositeScoreResult {
  compositeScore: number;
  compositeGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensionScores: Record<string, number>;
}

interface CiGateConfig {
  compositeThreshold?: number;
  perEvaluator?: Record<string, { min?: number; avg?: number }>;
  requiredPass?: string[];
}

interface GateFailure {
  gate: string;
  evaluator?: string;
  expected: number;
  actual: number;
  message: string;
}

export interface CiGateResult {
  passed: boolean;
  failedGates: GateFailure[];
}

const GRADE_THRESHOLDS: Array<[CompositeScoreResult['compositeGrade'], number]> = [
  ['A', 0.9],
  ['B', 0.8],
  ['C', 0.7],
  ['D', 0.6],
  ['F', 0],
];

export const computeCompositeScore = (
  evaluatorResults: Array<{ evaluator: string; score: number | null }>,
  config: CompositeScoreConfig
): CompositeScoreResult => {
  const dimensionScores: Record<string, number> = {};

  for (const [dimension, evaluatorNames] of Object.entries(config.dimensions)) {
    const scores = evaluatorNames
      .map((name) => evaluatorResults.find((r) => r.evaluator === name)?.score)
      .filter((s): s is number => s != null);

    dimensionScores[dimension] =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [dimension, weight] of Object.entries(config.weights)) {
    if (dimension in dimensionScores) {
      weightedSum += dimensionScores[dimension] * weight;
      totalWeight += weight;
    }
  }

  const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const compositeGrade =
    GRADE_THRESHOLDS.find(([, threshold]) => compositeScore >= threshold)?.[0] ?? 'F';

  return { compositeScore, compositeGrade, dimensionScores };
};

export const evaluateCiGates = (
  evaluatorResults: Array<{ evaluator: string; score: number | null }>,
  compositeScore: number,
  config: CiGateConfig
): CiGateResult => {
  const failedGates: GateFailure[] = [];

  if (config.compositeThreshold != null && compositeScore < config.compositeThreshold) {
    failedGates.push({
      gate: 'composite-threshold',
      expected: config.compositeThreshold,
      actual: compositeScore,
      message: `Composite score ${compositeScore.toFixed(3)} below threshold ${
        config.compositeThreshold
      }`,
    });
  }

  for (const required of config.requiredPass ?? []) {
    const result = evaluatorResults.find((r) => r.evaluator === required);
    if (!result || result.score === null || result.score === 0) {
      failedGates.push({
        gate: 'required-pass',
        evaluator: required,
        expected: 0,
        actual: result?.score ?? 0,
        message: `Required evaluator "${required}" failed (score: ${result?.score ?? 'null'})`,
      });
    }
  }

  for (const [evaluator, thresholds] of Object.entries(config.perEvaluator ?? {})) {
    const result = evaluatorResults.find((r) => r.evaluator === evaluator);
    if (result?.score != null && thresholds.min != null && result.score < thresholds.min) {
      failedGates.push({
        gate: 'per-evaluator-min',
        evaluator,
        expected: thresholds.min,
        actual: result.score,
        message: `Evaluator "${evaluator}" score ${result.score.toFixed(3)} below minimum ${
          thresholds.min
        }`,
      });
    }
  }

  return { passed: failedGates.length === 0, failedGates };
};

// ─────────────────────────────────────────────────────────────────────────────

export interface ConvergenceResult {
  finalScore: number;
  converged: boolean;
  reason: 'passed' | 'plateau' | 'max_iterations' | 'error';
  iterations: ConvergenceIteration[];
  totalDurationMs: number;
  gateResult: CiGateResult;
}

const SKILL_PRESET_EVALUATOR_NAMES = [
  // LLM judges
  'skill-relevance',
  'skill-completeness',
  'skill-accuracy',
  'skill-specificity',
  'skill-safety',
  // CODE evaluators — run first, gate LLM judges on failure
  'backing-index-validator',
  'esql-pattern',
  'esql-compile',
  'skill-index-resolves',
  'skill-pii',
  'skill-secret-scanner',
  'skill-prompt-injection',
];

const DEFAULT_COMPOSITE_CONFIG: CompositeScoreConfig = {
  weights: {
    safety: 0.25,
    accuracy: 0.2,
    completeness: 0.2,
    relevance: 0.2,
    specificity: 0.15,
  },
  dimensions: {
    safety: ['skill-safety'],
    accuracy: ['skill-accuracy'],
    completeness: ['skill-completeness'],
    relevance: ['skill-relevance'],
    specificity: ['skill-specificity'],
  },
};

export const resolveEvaluatorNames = (names: string[], registry: EvaluatorRegistry): string[] => {
  const resolved: string[] = [];
  for (const name of names) {
    if (name === 'skill-preset') {
      for (const presetName of SKILL_PRESET_EVALUATOR_NAMES) {
        if (registry.has(presetName)) {
          resolved.push(presetName);
        }
      }
    } else {
      resolved.push(name);
    }
  }
  return resolved;
};

export const getDefaultCompositeConfig = (): CompositeScoreConfig => DEFAULT_COMPOSITE_CONFIG;

const mapServerResultToSkillResult = (r: ServerEvaluatorResult): SkillEvaluatorResult => ({
  evaluator: r.evaluator,
  kind: r.kind,
  score: r.score,
  pass: r.score !== null && r.score > 0,
  explanation: r.explanation,
  trace_id: r.traceId,
});

export const runConvergenceLoop = async (
  skill: ProposedSkillDocument,
  config: ConvergenceConfig,
  dependencies: {
    evaluatorRegistry: EvaluatorRegistry;
    logger: Logger;
    improveSkill: (
      currentSkill: ProposedSkillDocument,
      feedback: SkillEvaluatorResult[]
    ) => Promise<ProposedSkillDocument>;
    /**
     * Inference client used by LLM-kind evaluators. Required if the evaluator
     * list includes any LLM judges (it does by default via `skill-preset`).
     */
    inferenceClient?: InferenceClient;
    /**
     * Scoped Elasticsearch client used by grounding evaluators (esql-compile,
     * skill-index-resolves). Optional — evaluators that need it will mark
     * themselves as 'skipped' if absent.
     */
    esClient?: ElasticsearchClient;
    /**
     * Called after every iteration so callers can persist intermediate state
     * (e.g. the AESOP route updates the .aesop-proposed-skills document with
     * the latest score/criteria so the UI can show progress). Errors here are
     * logged but do not abort the loop.
     */
    onIteration?: (iteration: ConvergenceIteration) => Promise<void> | void;
  }
): Promise<ConvergenceResult> => {
  const { threshold, maxIterations, convergenceDelta } = config;
  const { evaluatorRegistry, logger, improveSkill, inferenceClient, esClient, onIteration } =
    dependencies;
  const iterations: ConvergenceIteration[] = [];
  const startTime = Date.now();
  let currentSkill = skill;
  let previousScore = -1;
  let plateauCount = 0;

  const evaluatorNames = resolveEvaluatorNames(
    config.evaluators ?? ['skill-preset'],
    evaluatorRegistry
  );
  const runner = createEvaluationRunner(evaluatorRegistry, logger);

  for (let i = 1; i <= maxIterations; i++) {
    const runResult = await runner.run({
      items: [
        {
          input: { name: currentSkill.name, description: currentSkill.description },
          output: currentSkill.markdown,
        },
      ],
      evaluatorNames,
      connectorId: config.connectorId,
      requiredPass: config.requiredPass,
      inferenceClient,
      esClient,
    });

    const serverResults = runResult.results[0]?.evaluatorResults ?? [];
    const evaluatorResults = serverResults.map(mapServerResultToSkillResult);

    const compositeResult = computeCompositeScore(
      evaluatorResults.map((r) => ({ evaluator: r.evaluator, score: r.score })),
      getDefaultCompositeConfig()
    );

    const currentScore = compositeResult.compositeScore;
    const improved = i > 1 && currentScore > previousScore;

    const gateResult = evaluateCiGates(
      evaluatorResults.map((r) => ({ evaluator: r.evaluator, score: r.score })),
      currentScore,
      { requiredPass: config.requiredPass, compositeThreshold: threshold }
    );

    const iterationRecord: ConvergenceIteration = {
      iteration: i,
      score: currentScore,
      evaluator_results: evaluatorResults,
      improved,
      timestamp: new Date().toISOString(),
    };
    iterations.push(iterationRecord);

    if (onIteration) {
      try {
        await onIteration(iterationRecord);
      } catch (err) {
        logger.warn(
          `onIteration hook failed at iteration ${i}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    logger.info(
      `Convergence iteration ${i}: score=${currentScore.toFixed(3)}, gate=${
        gateResult.passed ? 'PASS' : 'FAIL'
      }`
    );

    if (gateResult.passed && currentScore >= threshold) {
      return {
        finalScore: currentScore,
        converged: true,
        reason: 'passed',
        iterations,
        totalDurationMs: Date.now() - startTime,
        gateResult,
      };
    }

    if (Math.abs(currentScore - previousScore) < convergenceDelta) {
      plateauCount++;
      if (plateauCount >= 2) {
        return {
          finalScore: currentScore,
          converged: false,
          reason: 'plateau',
          iterations,
          totalDurationMs: Date.now() - startTime,
          gateResult,
        };
      }
    } else {
      plateauCount = 0;
    }

    previousScore = currentScore;

    if (i < maxIterations) {
      try {
        currentSkill = await improveSkill(currentSkill, evaluatorResults);
      } catch (error) {
        logger.error(`Improvement failed at iteration ${i}: ${error}`);
        return {
          finalScore: currentScore,
          converged: false,
          reason: 'error',
          iterations,
          totalDurationMs: Date.now() - startTime,
          gateResult,
        };
      }
    }
  }

  const lastIteration = iterations[iterations.length - 1];
  const lastGateResult = evaluateCiGates(
    lastIteration?.evaluator_results.map((r) => ({ evaluator: r.evaluator, score: r.score })) ?? [],
    lastIteration?.score ?? 0,
    { requiredPass: config.requiredPass, compositeThreshold: threshold }
  );

  return {
    finalScore: lastIteration?.score ?? 0,
    converged: false,
    reason: 'max_iterations',
    iterations,
    totalDurationMs: Date.now() - startTime,
    gateResult: lastGateResult,
  };
};
