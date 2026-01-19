/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationScoreRepository } from './score_repository';

export class EvaluationAnalysisService {
  constructor(
    private readonly scoreRepository: EvaluationScoreRepository,
    private readonly log: SomeDevLog
  ) {}

  // This is the first pass (POC) for comparison and more detailed analysis (such as t-tests) can be added here.
  async compareEvaluationRuns({
    currentRunId,
    referenceRunId,
  }: {
    currentRunId: string;
    referenceRunId: string;
  }): Promise<{
    comparison: Array<{
      dataset: string;
      evaluator: string;
      currentScore: number;
      referenceScore: number;
      difference: number;
      percentageChange: number;
      isImprovement: boolean;
    }>;
    summary: {
      totalComparisons: number;
      improvements: number;
      regressions: number;
      noChange: number;
    };
    metadata: {
      currentRun: {
        runId: string;
        timestamp?: string;
        model?: string;
      };
      referenceRun: {
        runId: string;
        timestamp?: string;
        model?: string;
      };
    };
  }> {
    this.log.info(
      `Comparing evaluation runs: current=${currentRunId}, reference=${referenceRunId}`
    );

    const [currentScores, referenceScores] = await Promise.all([
      this.scoreRepository.getScoresByRunId(currentRunId),
      this.scoreRepository.getScoresByRunId(referenceRunId),
    ]);

    if (currentScores.length === 0) {
      throw new Error(`No scores found for current run ID: ${currentRunId}`);
    }

    if (referenceScores.length === 0) {
      throw new Error(`No scores found for reference run ID: ${referenceRunId}`);
    }

    this.log.info(
      `Retrieved ${currentScores.length} scores for current run and ${referenceScores.length} scores for reference run`
    );

    const referenceMap = new Map<string, number>();
    referenceScores.forEach((score) => {
      const key = `${score.dataset.name}||${score.evaluator.name}`;
      referenceMap.set(key, score.evaluator.stats.mean);
    });

    const comparison: Array<{
      dataset: string;
      evaluator: string;
      currentScore: number;
      referenceScore: number;
      difference: number;
      percentageChange: number;
      isImprovement: boolean;
    }> = [];

    let improvements = 0;
    let regressions = 0;
    let noChange = 0;

    for (const currentScore of currentScores) {
      const key = `${currentScore.dataset.name}||${currentScore.evaluator.name}`;
      const referenceScore = referenceMap.get(key);

      if (referenceScore !== undefined) {
        const current = currentScore.evaluator.stats.mean;
        const difference = current - referenceScore;
        const percentageChange = referenceScore !== 0 ? (difference / referenceScore) * 100 : 0;
        const isImprovement = difference > 0.001;
        const isRegression = difference < -0.001;

        if (isImprovement) improvements++;
        else if (isRegression) regressions++;
        else noChange++;

        comparison.push({
          dataset: currentScore.dataset.name,
          evaluator: currentScore.evaluator.name,
          currentScore: current,
          referenceScore,
          difference,
          percentageChange,
          isImprovement,
        });

        this.log.debug(
          `${currentScore.evaluator.name} on ${currentScore.dataset.name}: ${current.toFixed(
            3
          )} vs ${referenceScore.toFixed(3)} (${difference > 0 ? '+' : ''}${difference.toFixed(
            3
          )}, ${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`
        );
      } else {
        this.log.warning(
          `No matching reference score found for ${currentScore.evaluator.name} on ${currentScore.dataset.name}`
        );
      }
    }

    return {
      comparison: comparison.sort(
        (a, b) => a.dataset.localeCompare(b.dataset) || a.evaluator.localeCompare(b.evaluator)
      ),
      summary: {
        totalComparisons: comparison.length,
        improvements,
        regressions,
        noChange,
      },
      metadata: {
        currentRun: {
          runId: currentRunId,
          timestamp: currentScores[0]?.['@timestamp'],
          model: currentScores[0]?.model.id,
        },
        referenceRun: {
          runId: referenceRunId,
          timestamp: referenceScores[0]?.['@timestamp'],
          model: referenceScores[0]?.model.id,
        },
      },
    };
  }
}
