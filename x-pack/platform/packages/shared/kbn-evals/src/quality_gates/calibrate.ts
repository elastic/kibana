/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationScoreRepository, EvaluatorStats } from '../utils/score_repository';
import type { GateConfig } from './types';

export interface CalibrateOptions {
  runId: string;
  existingConfig?: GateConfig;
  mode: 'bootstrap' | 'tighten';
  /** Standard deviation multiplier for floor calculation (default: 2) */
  margin?: number;
  /** Optional filters forwarded to getStatsByRunId */
  taskModelId?: string;
  suiteId?: string;
}

interface CalibrationChange {
  evaluator: string;
  previous?: number;
  recommended: number;
  reason: string;
}

export interface CalibrationResult {
  config: GateConfig;
  changes: CalibrationChange[];
}

/**
 * Compute recommended quality thresholds from a completed eval run.
 *
 * - **Bootstrap mode** (no existing config): generates initial thresholds
 *   where floor = mean − margin*stdDev and target = mean.
 * - **Tighten mode** (existing config): only raises thresholds when actuals
 *   significantly exceed current values (avoids lowering the bar).
 */
export const calibrateThresholds = async (
  repository: EvaluationScoreRepository,
  log: SomeDevLog,
  options: CalibrateOptions
): Promise<CalibrationResult> => {
  const { runId, existingConfig, mode, margin = 2, taskModelId, suiteId } = options;

  const runStats = await repository.getStatsByRunId(runId, { taskModelId, suiteId });
  if (!runStats) {
    throw new Error(`No stats found for run ID "${runId}"`);
  }

  const { stats } = runStats;
  const changes: CalibrationChange[] = [];
  const evaluatorThresholds: Record<string, { min?: number; avg?: number }> = {};

  let globalScoreSum = 0;
  let globalScoreCount = 0;

  for (const evalStat of stats) {
    const { evaluatorName, stats: evalStats } = evalStat;
    const { mean, stdDev } = evalStats;

    if (!Number.isFinite(mean) || !Number.isFinite(stdDev)) {
      log.warning(
        `Evaluator "${evaluatorName}" has non-finite stats (mean=${mean}, stdDev=${stdDev}), skipping`
      );
      continue;
    }

    globalScoreSum += mean;
    globalScoreCount++;

    const floor = Math.max(0, mean - margin * stdDev);
    const target = mean;
    const recommended = roundTo(target, 3);
    const recommendedMin = roundTo(floor, 3);

    if (mode === 'bootstrap') {
      evaluatorThresholds[evaluatorName] = { min: recommendedMin, avg: recommended };
      changes.push({
        evaluator: evaluatorName,
        recommended,
        reason: `Bootstrap: mean=${roundTo(mean, 3)}, stdDev=${roundTo(
          stdDev,
          3
        )}, floor=${recommendedMin}`,
      });
    } else {
      const existing = existingConfig?.evaluators?.[evaluatorName];
      const currentAvg = existing?.avg;

      if (currentAvg === undefined || recommended > currentAvg) {
        evaluatorThresholds[evaluatorName] = {
          min: existing?.min ?? recommendedMin,
          avg: recommended,
        };
        changes.push({
          evaluator: evaluatorName,
          previous: currentAvg,
          recommended,
          reason:
            currentAvg === undefined
              ? `New evaluator threshold: mean=${roundTo(mean, 3)}`
              : `Tightened: actual mean (${roundTo(mean, 3)}) exceeds current (${currentAvg})`,
        });
      } else {
        evaluatorThresholds[evaluatorName] = { ...existing };
      }
    }
  }

  const globalAvg = globalScoreCount > 0 ? roundTo(globalScoreSum / globalScoreCount, 3) : 0;
  const scoreThreshold =
    mode === 'bootstrap'
      ? { avg: globalAvg }
      : existingConfig?.score && globalAvg > existingConfig.score.avg
      ? { avg: globalAvg }
      : existingConfig?.score ?? { avg: globalAvg };

  const config: GateConfig = {
    score: scoreThreshold,
    evaluators: evaluatorThresholds,
    required_pass: existingConfig?.required_pass ?? deriveRequiredPass(stats),
    first_try_pass_rate: existingConfig?.first_try_pass_rate,
  };

  if (changes.length === 0) {
    log.info('Calibration complete: no threshold changes recommended');
  } else {
    log.info(`Calibration complete: ${changes.length} threshold change(s) recommended`);
  }

  return { config, changes };
};

const deriveRequiredPass = (stats: EvaluatorStats[]): string[] => {
  const seen = new Set<string>();
  for (const s of stats) {
    seen.add(s.evaluatorName);
  }
  return Array.from(seen);
};

const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};
