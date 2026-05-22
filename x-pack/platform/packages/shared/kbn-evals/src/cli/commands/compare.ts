/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import { computePairedTTestResults, pairScores } from '@kbn/evals-common';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { formatPairedTTestReport } from '../../utils/reporting/compare_report';

const DEFAULT_EVALUATIONS_KBN_URL = 'http://elastic:changeme@localhost:5601';

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation experiments using paired t-tests.

  NOTE: The two experiments must use the same experiment orchestrator (e.g. Kibana or Phoenix), due to the different handling of the dataset/example IDs.
  Scores are read from the evals plugin on the target Kibana.
  Configure target/auth with EVALUATIONS_KBN_URL and EVALUATIONS_KBN_API_KEY.

  Example:
    node scripts/evals compare <experiment-id-1> <experiment-id-2>
  `,
  run: async ({ log, flagsReader }) => {
    const [firstExperimentId, secondExperimentId, ...extraArgs] = flagsReader.getPositionals();

    if (!firstExperimentId || !secondExperimentId) {
      throw createFlagError(
        'Two experiment IDs are required. Example: node scripts/evals compare <experiment-id-1> <experiment-id-2>. Configure target Kibana with EVALUATIONS_KBN_URL and EVALUATIONS_KBN_API_KEY.'
      );
    }

    if (extraArgs.length > 0) {
      throw createFlagError('Unexpected extra arguments. Provide exactly two experiment IDs.');
    }

    const evaluationsKbnUrl = process.env.EVALUATIONS_KBN_URL;
    if (!evaluationsKbnUrl) {
      log.warning(`EVALUATIONS_KBN_URL not set; defaulting to ${DEFAULT_EVALUATIONS_KBN_URL}.`);
    }

    const defaultKbnClient = new KbnClient({ log, url: DEFAULT_EVALUATIONS_KBN_URL });
    const kbnClient = getEvaluationsKbnClient({
      kbnClient: defaultKbnClient,
      log,
      evaluationsKbnUrl,
      evaluationsKbnApiKey: process.env.EVALUATIONS_KBN_API_KEY,
    });
    const evalsClient = new EvalsClient(kbnClient, log);

    try {
      await evalsClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVALUATIONS_KBN_URL to a Kibana instance with xpack.evals.enabled=true.',
          'Set EVALUATIONS_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    const [firstExperimentScores, secondExperimentScores] = await Promise.all([
      evalsClient.getExperimentScores(firstExperimentId),
      evalsClient.getExperimentScores(secondExperimentId),
    ]);

    if (firstExperimentScores.length === 0) {
      throw new Error(`No scores found for experiment ID: ${firstExperimentId}`);
    }

    if (secondExperimentScores.length === 0) {
      throw new Error(`No scores found for experiment ID: ${secondExperimentId}`);
    }

    const firstExperimentDatasets = new Map(
      firstExperimentScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const secondExperimentDatasets = new Map(
      secondExperimentScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const overlappingDatasetIds = [...firstExperimentDatasets.keys()].filter((id) =>
      secondExperimentDatasets.has(id)
    );

    if (overlappingDatasetIds.length === 0) {
      throw new Error('No overlapping datasets found between the two experiments.');
    }

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredFirstScores = firstExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredSecondScores = secondExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      filteredFirstScores,
      filteredSecondScores
    );

    if (pairs.length === 0) {
      throw new Error('No paired scores found between the two experiments.');
    }

    log.info(
      `Paired ${pairs.length} scores (skipped ${skippedMissingPairs} missing pairs, ${skippedNullScores} null scores).`
    );

    const results = computePairedTTestResults(pairs);
    if (results.length === 0) {
      log.warning('No t-test results returned.');
      return;
    }

    const report = formatPairedTTestReport({
      experimentIdA: firstExperimentId,
      experimentIdB: secondExperimentId,
      results,
    });

    log.info(`\n\n${report.header.join('\n')}`);
    log.info(`\n${report.summary}\n${report.tableOutput}`);
  },
};
