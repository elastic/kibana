/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { createEsClientForTesting } from '@kbn/test-es-server';
import { EvaluationScoreRepository } from '../../utils/score_repository';
import { formatPairedTTestReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';
import { computePairedTTestResults } from '../../utils/statistical_analysis';

const DEFAULT_EVALUATIONS_ES_URL = 'http://elastic:changeme@localhost:9200';

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation runs using paired t-tests.

  NOTE: The two runs must use the same experiment orchestrator (e.g. Kibana or Phoenix), due to the different handling of the dataset/example IDs.

  Example (explicit IDs):
    node scripts/evals compare <run-id-1> <run-id-2>

  Example (auto-discover baseline):
    node scripts/evals compare <pr-run-id> --baseline-branch main --suite sigevents --format markdown
  `,
  run: async ({ log, flagsReader }) => {
    const [firstRunId, secondRunIdPositional, ...extraArgs] = flagsReader.getPositionals();

    const baselineBranch = flagsReader.string('baseline-branch') ?? undefined;
    const suite = flagsReader.string('suite') ?? undefined;
    const format = (flagsReader.string('format') ?? 'terminal') as 'terminal' | 'markdown';
    const kibanaUrl = flagsReader.string('kibana-url') ?? undefined;

    if (format !== 'terminal' && format !== 'markdown') {
      throw createFlagError('--format must be "terminal" or "markdown".');
    }

    if (!firstRunId) {
      throw createFlagError(
        'At least one run ID is required. Example: node scripts/evals compare <run-id-1> <run-id-2>'
      );
    }

    if (extraArgs.length > 0) {
      throw createFlagError('Unexpected extra arguments.');
    }

    if (secondRunIdPositional && baselineBranch) {
      throw createFlagError(
        'Cannot specify both a second run ID and --baseline-branch. Use one or the other.'
      );
    }

    if (!secondRunIdPositional && !baselineBranch) {
      throw createFlagError(
        'Provide a second run ID or use --baseline-branch to auto-discover a baseline.'
      );
    }

    if (baselineBranch && !suite) {
      throw createFlagError('--suite is required when using --baseline-branch.');
    }

    const evaluationsEsUrl = process.env.EVALUATIONS_ES_URL ?? DEFAULT_EVALUATIONS_ES_URL;
    if (!process.env.EVALUATIONS_ES_URL) {
      log.warning(`EVALUATIONS_ES_URL not set; defaulting to ${DEFAULT_EVALUATIONS_ES_URL}.`);
    }

    const esClient = createEsClientForTesting({ esUrl: evaluationsEsUrl });
    const scoreRepository = new EvaluationScoreRepository(esClient, log);

    let secondRunId = secondRunIdPositional;

    if (!secondRunId && baselineBranch && suite) {
      log.info(
        `Looking up latest baseline run on branch "${baselineBranch}" for suite "${suite}"...`
      );
      const baselineId = await scoreRepository.findLatestBaselineRunId(
        suite,
        baselineBranch,
        firstRunId
      );

      if (!baselineId) {
        log.warning(
          `No baseline run found for suite "${suite}" on branch "${baselineBranch}". Nothing to compare.`
        );
        return;
      }

      log.info(`Found baseline run: ${baselineId}`);
      secondRunId = baselineId;
    }

    const scoreOpts = suite ? { suiteId: suite } : undefined;

    const [firstRunScores, secondRunScores] = await Promise.all([
      scoreRepository.getScoresByRunId(firstRunId, scoreOpts),
      scoreRepository.getScoresByRunId(secondRunId!, scoreOpts),
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

    const results = computePairedTTestResults(filteredFirstRunScores, filteredSecondRunScores);
    if (results.length === 0) {
      throw new Error('No paired scores found between the two runs.');
    }

    const totalPairs = results.reduce((sum, r) => sum + r.sampleSize, 0);
    log.info(
      `Computed ${results.length} evaluator comparison(s) across ${totalPairs} paired scores.`
    );

    if (format === 'markdown') {
      const markdown = formatMarkdownCompareReport({
        suiteId: suite ?? 'unknown',
        prRunId: firstRunId,
        baselineRunId: secondRunId!,
        baselineBranch: baselineBranch ?? 'unknown',
        results,
        kibanaUrl,
      });
      process.stdout.write(markdown);
    } else {
      const report = formatPairedTTestReport({
        runIdA: firstRunId,
        runIdB: secondRunId!,
        results,
      });

      log.info(`\n\n${report.header.join('\n')}`);
      log.info(`\n${report.summary}\n${report.tableOutput}`);
    }
  },
};
