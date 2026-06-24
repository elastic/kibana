/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import { computePairedTTestResults, pairScores } from '@kbn/evals-common';
import type { BaselineExperiment } from '../../utils/evals_client';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { formatPairedTTestReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';

const DEFAULT_EVALUATIONS_KBN_URL = 'http://elastic:changeme@localhost:5601';

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation experiments using paired t-tests.

  Usage modes:
    1. Direct comparison of two experiment IDs:
       node scripts/evals compare <experiment-id-1> <experiment-id-2>

    2. Auto-resolve baseline from a branch (for CI):
       node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>

  Options:
    --baseline-branch  Branch to find the latest baseline experiment on (e.g. "main")
    --suite            Suite ID filter for baseline lookup and score filtering
    --format           Output format: "terminal" (default) or "markdown"
    --kibana-url       Kibana URL for generating compare page links in markdown
    --output           Write markdown output to a file instead of stdout
    --refresh-url      URL to include as a "Refresh Baseline" link in markdown output

  Environment:
    EVALUATIONS_KBN_URL      Target Kibana URL (defaults to localhost)
    EVALUATIONS_KBN_API_KEY  API key for authenticating to the target Kibana
  `,
  flags: {
    string: ['baseline-branch', 'suite', 'format', 'kibana-url', 'output', 'refresh-url'],
    help: `
      --baseline-branch  Branch to find the latest baseline experiment on
      --suite            Suite ID filter for baseline lookup and score filtering
      --format           Output format: "terminal" (default) or "markdown"
      --kibana-url       Kibana URL for generating compare page links in markdown
      --output           Write markdown output to a file instead of stdout
      --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
    `,
  },
  run: async ({ log, flagsReader }) => {
    const positionals = flagsReader.getPositionals();
    const baselineBranch = flagsReader.string('baseline-branch');
    const suiteId = flagsReader.string('suite');
    const format = flagsReader.string('format') ?? 'terminal';
    const kibanaUrl = flagsReader.string('kibana-url');
    const outputPath = flagsReader.string('output');
    const refreshUrl = flagsReader.string('refresh-url');

    if (format !== 'terminal' && format !== 'markdown') {
      throw createFlagError('--format must be "terminal" or "markdown".');
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

    let firstExperimentId: string;
    let secondExperimentId: string;
    let baselineMetadata: BaselineExperiment | undefined;

    if (baselineBranch) {
      if (!suiteId) {
        throw createFlagError('--suite is required when using --baseline-branch.');
      }

      firstExperimentId = positionals[0];
      if (!firstExperimentId) {
        throw createFlagError(
          'One experiment ID is required with --baseline-branch. Example: node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>'
        );
      }

      log.info(
        `Looking up latest baseline experiment for suite "${suiteId}" on branch "${baselineBranch}"...`
      );

      baselineMetadata = await evalsClient.findLatestBaselineExperiment({
        suiteId,
        branch: baselineBranch,
        excludeExecutionId: firstExperimentId,
      });

      if (!baselineMetadata) {
        log.warning(
          `No baseline experiment found for suite ${suiteId} on branch ${baselineBranch}. Nothing to compare.`
        );
        return;
      }

      secondExperimentId = baselineMetadata.executionId;
      log.info(`Found baseline experiment: ${secondExperimentId}`);
    } else {
      [firstExperimentId, secondExperimentId] = positionals;
      if (!firstExperimentId || !secondExperimentId) {
        throw createFlagError(
          'Two experiment IDs are required. Example: node scripts/evals compare <experiment-id-1> <experiment-id-2>. Configure target Kibana with EVALUATIONS_KBN_URL and EVALUATIONS_KBN_API_KEY.'
        );
      }

      if (positionals.length > 2) {
        throw createFlagError('Unexpected extra arguments. Provide exactly two experiment IDs.');
      }
    }

    const executionIdFilter = suiteId ? { suiteId, executionId: firstExperimentId } : undefined;
    const baselineFilter = suiteId ? { suiteId, executionId: secondExperimentId } : undefined;

    const [firstExperimentScores, secondExperimentScores] = await Promise.all([
      evalsClient.getExperimentScores(firstExperimentId, executionIdFilter),
      evalsClient.getExperimentScores(secondExperimentId, baselineFilter),
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

    if (format === 'markdown') {
      let comparePageUrl: string | undefined;
      const effectiveKibanaUrl = kibanaUrl ?? evaluationsKbnUrl;
      if (effectiveKibanaUrl) {
        const baseUrl = effectiveKibanaUrl.replace(/\/+$/, '');
        comparePageUrl = `${baseUrl}/app/management/ai/evals/compare?runA=${encodeURIComponent(
          firstExperimentId
        )}&runB=${encodeURIComponent(secondExperimentId)}`;
      }

      const markdown = formatMarkdownCompareReport({
        experimentIdA: firstExperimentId,
        experimentIdB: secondExperimentId,
        results,
        comparePageUrl,
        baselineTimestamp: baselineMetadata?.timestamp,
        baselineCommitSha: baselineMetadata?.gitCommitSha ?? undefined,
        refreshBaselineUrl: refreshUrl,
      });

      if (outputPath) {
        Fs.appendFileSync(outputPath, markdown + '\n\n');
        log.info(`Markdown report appended to ${outputPath}`);
      } else {
        process.stdout.write(markdown + '\n');
      }
    } else {
      const report = formatPairedTTestReport({
        experimentIdA: firstExperimentId,
        experimentIdB: secondExperimentId,
        results,
      });

      log.info(`\n\n${report.header.join('\n')}`);
      log.info(`\n${report.summary}\n${report.tableOutput}`);
    }
  },
};
