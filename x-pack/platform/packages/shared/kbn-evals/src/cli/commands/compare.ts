/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { createEsClientForTesting } from '@kbn/test-es-server';
import {
  computePairedTTestResults,
  pairScores,
  type EvaluationScoreDocument as CommonEvaluationScoreDocument,
} from '@kbn/evals-common';
import { EvaluationScoreRepository } from '../../utils/score_repository';
import { isElasticCloudEsUrl } from '../../utils/es_url';
import { formatPairedTTestReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';

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
  flags: {
    string: ['baseline-branch', 'suite', 'format', 'kibana-url', 'output'],
    help: `
      --baseline-branch <branch>  Branch to look up the latest baseline run (e.g. "main")
      --suite <id>                Suite ID to filter scores for (required with --baseline-branch)
      --format <type>             Output format: "terminal" (default) or "markdown"
      --kibana-url <url>          Kibana base URL for deep-links in markdown output
      --output <file>             Write report to file instead of stdout (avoids mixing with log output)
    `,
  },
  run: async ({ log, flagsReader }) => {
    const [firstRunId, secondRunIdPositional, ...extraArgs] = flagsReader.getPositionals();

    const baselineBranch = flagsReader.string('baseline-branch') ?? undefined;
    const suite = flagsReader.string('suite') ?? undefined;
    const format = (flagsReader.string('format') ?? 'terminal') as 'terminal' | 'markdown';
    const kibanaUrl = flagsReader.string('kibana-url') ?? undefined;
    const outputFile = flagsReader.string('output') ?? undefined;

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
    const evaluationsEsApiKey = process.env.EVALUATIONS_ES_API_KEY;
    if (!process.env.EVALUATIONS_ES_URL) {
      log.warning(`EVALUATIONS_ES_URL not set; defaulting to ${DEFAULT_EVALUATIONS_ES_URL}.`);
    }

    const esClient = createEsClientForTesting({
      esUrl: evaluationsEsUrl,
      isCloud: isElasticCloudEsUrl(evaluationsEsUrl),
      ...(evaluationsEsApiKey ? { auth: { apiKey: evaluationsEsApiKey } } : {}),
    });
    const scoreRepository = new EvaluationScoreRepository(esClient, log);

    let secondRunId = secondRunIdPositional;
    let baselineTimestamp: string | null = null;
    let baselineCommitSha: string | null = null;

    if (!secondRunId && baselineBranch && suite) {
      log.info(
        `Looking up latest baseline run on branch "${baselineBranch}" for suite "${suite}"...`
      );
      const baseline = await scoreRepository.findLatestBaselineRun(
        suite,
        baselineBranch,
        firstRunId
      );

      if (!baseline) {
        log.warning(
          `No baseline run found for suite "${suite}" on branch "${baselineBranch}". Nothing to compare.`
        );
        return;
      }

      log.info(`Found baseline run: ${baseline.runId}`);
      secondRunId = baseline.runId;
      baselineTimestamp = baseline.timestamp;
      baselineCommitSha = baseline.commitSha;
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

    const scoresA = filteredFirstRunScores as unknown as CommonEvaluationScoreDocument[];
    const scoresB = filteredSecondRunScores as unknown as CommonEvaluationScoreDocument[];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(scoresA, scoresB);

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

    if (format === 'markdown') {
      const markdown = formatMarkdownCompareReport({
        suiteId: suite ?? 'unknown',
        prRunId: firstRunId,
        baselineRunId: secondRunId!,
        baselineBranch: baselineBranch ?? 'unknown',
        baselineTimestamp,
        baselineCommitSha,
        results,
        kibanaUrl,
      });
      if (outputFile) {
        Fs.writeFileSync(outputFile, markdown, 'utf-8');
        log.info(`Markdown report written to ${outputFile}`);
      } else {
        process.stdout.write(markdown);
      }
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
