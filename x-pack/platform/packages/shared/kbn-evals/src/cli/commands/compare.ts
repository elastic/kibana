/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { createEsClientForTesting } from '@kbn/test';
import { EvaluationScoreRepository } from '../../utils/score_repository';
import { formatPairedTTestReport } from '../../utils/reporting/compare_report';
import { computePairedTTestResults, pairScores } from '../../utils/statistical_analysis';

const DEFAULT_EVALUATIONS_ES_URL = 'http://elastic:changeme@localhost:9200';

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation runs using paired t-tests.

  Example:
    node scripts/evals compare <run-id-1> <run-id-2>
  `,
  run: async ({ log, flagsReader }) => {
    const [firstRunId, secondRunId, ...extraArgs] = flagsReader.getPositionals();

    if (!firstRunId || !secondRunId) {
      throw createFlagError(
        'Two run IDs are required. Example: node scripts/evals compare <run-id-1> <run-id-2>'
      );
    }

    if (extraArgs.length > 0) {
      throw createFlagError('Unexpected extra arguments. Provide exactly two run IDs.');
    }

    const evaluationsEsUrl = process.env.EVALUATIONS_ES_URL ?? DEFAULT_EVALUATIONS_ES_URL;
    if (!process.env.EVALUATIONS_ES_URL) {
      log.warning(
        `EVALUATIONS_ES_URL not set; defaulting to ${DEFAULT_EVALUATIONS_ES_URL}.`
      );
    }

    const esClient = createEsClientForTesting({ esUrl: evaluationsEsUrl });
    const scoreRepository = new EvaluationScoreRepository(esClient, log);

    const [scoresA, scoresB] = await Promise.all([
      scoreRepository.getScoresByRunId(firstRunId),
      scoreRepository.getScoresByRunId(secondRunId),
    ]);

    if (scoresA.length === 0) {
      throw new Error(`No scores found for run ID: ${firstRunId}`);
    }

    if (scoresB.length === 0) {
      throw new Error(`No scores found for run ID: ${secondRunId}`);
    }

    const datasetsA = new Map(
      scoresA.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const datasetsB = new Map(
      scoresB.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const overlappingDatasetIds = [...datasetsA.keys()].filter((id) => datasetsB.has(id));

    if (overlappingDatasetIds.length === 0) {
      throw new Error('No overlapping datasets found between the two runs.');
    }

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredScoresA = scoresA.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredScoresB = scoresB.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      filteredScoresA,
      filteredScoresB
    );

    if (pairs.length === 0) {
      throw new Error('No paired scores found between the two runs.');
    }

    log.info(
      `Paired ${pairs.length} scores (skipped ${skippedMissingPairs} missing pairs, ${skippedNullScores} null scores).`
    );

    const results = computePairedTTestResults(filteredScoresA, filteredScoresB);
    if (results.length === 0) {
      log.warning('No t-test results returned.');
      return;
    }

    const report = formatPairedTTestReport({
      runIdA: firstRunId,
      runIdB: secondRunId,
      results,
    });

    log.info(`\n\n${report.header.join('\n')}`);
    log.info(`\n${report.summary}\n${report.tableOutput}`);
  },
};
