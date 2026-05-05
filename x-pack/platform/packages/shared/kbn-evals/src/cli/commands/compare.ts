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
  Compare two evaluation runs using paired t-tests.

  NOTE: The two runs must use the same experiment orchestrator (e.g. Kibana or Phoenix), due to the different handling of the dataset/example IDs.
  Scores are read from the evals plugin on the target Kibana.
  Configure target/auth with EVALUATIONS_KBN_URL and EVALUATIONS_KBN_API_KEY.

  Example:
    node scripts/evals compare <run-id-1> <run-id-2>
  `,
  run: async ({ log, flagsReader }) => {
    const [firstRunId, secondRunId, ...extraArgs] = flagsReader.getPositionals();

    if (!firstRunId || !secondRunId) {
      throw createFlagError(
        'Two run IDs are required. Example: node scripts/evals compare <run-id-1> <run-id-2>. Configure target Kibana with EVALUATIONS_KBN_URL and EVALUATIONS_KBN_API_KEY.'
      );
    }

    if (extraArgs.length > 0) {
      throw createFlagError('Unexpected extra arguments. Provide exactly two run IDs.');
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
    const evalsKbnClient = new EvalsClient(kbnClient, log);

    try {
      await evalsKbnClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVALUATIONS_KBN_URL to a Kibana instance with xpack.evals.enabled=true.',
          'Set EVALUATIONS_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    const [firstRunScores, secondRunScores] = await Promise.all([
      evalsKbnClient.getRunScores(firstRunId),
      evalsKbnClient.getRunScores(secondRunId),
    ]);

    if (firstRunScores.length === 0) {
      throw new Error(`No scores found for run ID: ${firstRunId}`);
    }

    if (secondRunScores.length === 0) {
      throw new Error(`No scores found for run ID: ${secondRunId}`);
    }

    const firstRunDatasets = new Map(
      firstRunScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const secondRunDatasets = new Map(
      secondRunScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const overlappingDatasetIds = [...firstRunDatasets.keys()].filter((id) =>
      secondRunDatasets.has(id)
    );

    if (overlappingDatasetIds.length === 0) {
      throw new Error('No overlapping datasets found between the two runs.');
    }

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredFirstRunScores = firstRunScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredSecondRunScores = secondRunScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      filteredFirstRunScores,
      filteredSecondRunScores
    );

    if (pairs.length === 0) {
      throw new Error('No paired scores found between the two runs.');
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
      runIdA: firstRunId,
      runIdB: secondRunId,
      results,
    });

    log.info(`\n\n${report.header.join('\n')}`);
    log.info(`\n${report.summary}\n${report.tableOutput}`);
  },
};
