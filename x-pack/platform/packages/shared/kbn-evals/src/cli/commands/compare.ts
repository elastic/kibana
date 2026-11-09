/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command, RunContext } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import { compareScores, pairScores } from '@kbn/evals-common';
import type { BaselineExperiment } from '../../utils/evals_client';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { getSpaceIdsFromEnv } from '../../utils/space_ids';
import { buildExecutionCompareUrl } from '../../utils/evals_ui_url';
import { readSpaceIdsFlag } from '../run_helpers';
import { formatCompareReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';
import { averageMatchedRepetitions } from '../../utils/reporting/average_repetitions';
import { attachEffectSigns } from '../../utils/reporting/effect_direction';
import { applyHolmCorrection } from '../../utils/reporting/holm_correction';
import { retestWilcoxonWithExactTies } from '../../utils/reporting/wilcoxon_ties';
import {
  DEFAULT_REGRESSION_MIN_PAIRS,
  evaluateRegressionGate,
  formatRegressionGateReport,
} from '../../utils/reporting/regression_gate';

const DEFAULT_EVAL_KBN_URL = 'http://elastic:changeme@localhost:5601';

// Exit 1 stays with usage and unexpected errors (including ones the CLI runner raises before this
// command runs), so a regression needs a code of its own.
export const GATE_INCONCLUSIVE_EXIT_CODE = 2;
export const GATE_REGRESSION_EXIT_CODE = 3;

export const compareCmd = {
  name: 'compare',
  description: `
  Compare two evaluation experiments with a paired statistical test per dataset and evaluator.

  Usage modes:
    1. Direct comparison of two experiment IDs (target first, baseline second):
       node scripts/evals compare <target-experiment-id> <baseline-experiment-id>

    2. Auto-resolve baseline from a branch (for CI):
       node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>

  Options:
    --baseline-branch  Branch to find the latest baseline experiment on (e.g. "main")
    --suite            Suite ID filter for baseline lookup and score filtering
    --format           Output format: "terminal" (default) or "markdown"
    --kibana-url       Kibana URL for generating compare page links in markdown
    --output           Append markdown output to a file instead of stdout
    --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
    --space-ids        Spaces the experiments were run in (same value as "evals run")

  Regression gate:
    --fail-on-regression            Exit non-zero if any evaluator got significantly worse
                                    (direction-aware; higher-is-better and lower-is-better
                                    evaluators are both handled, neutral ones never trip).
                                    Exit codes: 0 passed, 1 usage or unexpected error, 2
                                    inconclusive or not evaluated (no baseline, no scores or
                                    pairs, nothing checkable, no evaluator matched), 3
                                    significant regression. Pairs per example: repetitions are
                                    averaged over the count both runs share
    --regression-evaluators         Comma-separated evaluator names that can trip the gate
                                    (default: all). Names absent from the
                                    comparison warn; if none match, the run fails.
                                    Requires --fail-on-regression.
    --min-pairs                     Minimum paired examples for an evaluator to be gated
                                    (default: ${DEFAULT_REGRESSION_MIN_PAIRS}). Fewer pairs are reported as
                                    "insufficient pairs" and cannot trip the gate.
                                    Requires --fail-on-regression.
    --multiplicity-correction       Holm-Bonferroni adjust p-values across all comparisons in the
                                    run and show both raw and adjusted values. On by default with
                                    --fail-on-regression; off otherwise, to match the evals UI.
    --no-multiplicity-correction    Judge significance on raw p-values, also under the gate.

  Environment:
    EVAL_KBN_URL      Target Kibana URL (defaults to localhost)
    EVAL_KBN_API_KEY  API key for authenticating to the target Kibana
    EVAL_SPACE_IDS    Spaces the experiments were run in (same as --space-ids)
  `,
  flags: {
    string: [
      'baseline-branch',
      'suite',
      'format',
      'kibana-url',
      'output',
      'refresh-url',
      'space-ids',
      'regression-evaluators',
      'min-pairs',
    ],
    boolean: ['fail-on-regression', 'multiplicity-correction'],
    // null survives getopts' boolean defaulting, so an absent flag stays distinguishable from
    // --no-multiplicity-correction.
    default: { 'fail-on-regression': false, 'multiplicity-correction': null },
    help: `
      --baseline-branch  Branch to find the latest baseline experiment on
      --suite            Suite ID filter for baseline lookup and score filtering
      --format           Output format: "terminal" (default) or "markdown"
      --kibana-url       Kibana URL for generating compare page links in markdown
      --output           Append markdown output to a file instead of stdout
      --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
      --space-ids        Spaces the experiments were run in
      --fail-on-regression            Exit 3 if any evaluator got significantly worse, 2 if the gate was inconclusive or not evaluated
      --regression-evaluators         Comma-separated evaluator names that can trip the gate (default: all)
      --min-pairs                     Minimum paired examples for an evaluator to be gated (default: ${DEFAULT_REGRESSION_MIN_PAIRS})
      --multiplicity-correction       Holm-Bonferroni adjust p-values (default with --fail-on-regression)
      --no-multiplicity-correction    Use raw p-values, also under --fail-on-regression
    `,
  },
  run: async ({ log, flags, flagsReader }: RunContext) => {
    const positionals = flagsReader.getPositionals();
    const baselineBranch = flagsReader.string('baseline-branch');
    const suiteId = flagsReader.string('suite');
    const format = flagsReader.string('format') ?? 'terminal';
    const kibanaUrl = flagsReader.string('kibana-url');
    const outputPath = flagsReader.string('output');
    const refreshUrl = flagsReader.string('refresh-url');
    const failOnRegression = flagsReader.boolean('fail-on-regression');
    const rawMultiplicityCorrection = flags['multiplicity-correction'];
    const multiplicityCorrection =
      typeof rawMultiplicityCorrection === 'boolean' ? rawMultiplicityCorrection : failOnRegression;
    const rawRegressionEvaluators = flagsReader.string('regression-evaluators');
    const regressionEvaluators = rawRegressionEvaluators
      ?.split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const rawMinPairs = flagsReader.string('min-pairs');
    // Scores are only readable from the spaces they were ingested into, so a
    // comparison has to be made from where the runs put them.
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();

    // "Nothing to compare" means the gate was not evaluated. Under --fail-on-regression that gets
    // its own exit code; otherwise it stays the plain error it always was.
    const nothingToCompare = (message: string): Error =>
      failOnRegression
        ? createFailError(`${message} --fail-on-regression: regression gate was NOT evaluated.`, {
            exitCode: GATE_INCONCLUSIVE_EXIT_CODE,
          })
        : new Error(message);

    if (format !== 'terminal' && format !== 'markdown') {
      throw createFlagError('--format must be "terminal" or "markdown".');
    }

    // Both only shape the gate; accepting them without it would look like a gated run that is not.
    if (!failOnRegression && (rawMinPairs !== undefined || rawRegressionEvaluators !== undefined)) {
      throw createFlagError(
        '--min-pairs and --regression-evaluators only apply with --fail-on-regression.'
      );
    }

    // FlagsReader.number uses parseFloat, which would accept "10abc".
    if (rawMinPairs !== undefined && !/^\s*\d+\s*$/.test(rawMinPairs)) {
      throw createFlagError('--min-pairs must be a positive integer.');
    }
    const minPairs =
      rawMinPairs === undefined ? DEFAULT_REGRESSION_MIN_PAIRS : Number(rawMinPairs.trim());
    if (minPairs < 1 || !Number.isSafeInteger(minPairs)) {
      throw createFlagError('--min-pairs must be a positive integer.');
    }

    if (rawRegressionEvaluators !== undefined && regressionEvaluators?.length === 0) {
      throw createFlagError('--regression-evaluators must list at least one evaluator name.');
    }

    const evaluationsKbnUrl = process.env.EVAL_KBN_URL;
    if (!evaluationsKbnUrl) {
      log.warning(`EVAL_KBN_URL not set; defaulting to ${DEFAULT_EVAL_KBN_URL}.`);
    }

    const defaultKbnClient = new KbnClient({ log, url: DEFAULT_EVAL_KBN_URL });
    const kbnClient = getEvaluationsKbnClient({
      kbnClient: defaultKbnClient,
      log,
      evaluationsKbnUrl,
      evaluationsKbnApiKey: process.env.EVAL_KBN_API_KEY,
    });
    const evalsClient = new EvalsClient(kbnClient, log, { spaceIds });

    try {
      await evalsClient.assertPluginEnabled();
    } catch (error) {
      throw createFlagError(
        [
          error instanceof Error ? error.message : String(error),
          'Set EVAL_KBN_URL to a Kibana instance with xpack.evals.enabled=true and xpack.evals.mode=full.',
          'Set EVAL_KBN_API_KEY when authenticating to a non-local target.',
        ].join('\n')
      );
    }

    try {
      await evalsClient.assertSpacesExist();
    } catch (error) {
      throw createFlagError(error instanceof Error ? error.message : String(error));
    }

    let targetExperimentId: string;
    let baselineExperimentId: string;
    let baselineMetadata: BaselineExperiment | undefined;

    if (baselineBranch) {
      if (!suiteId) {
        throw createFlagError('--suite is required when using --baseline-branch.');
      }

      targetExperimentId = positionals[0];
      if (!targetExperimentId) {
        throw createFlagError(
          'One experiment ID is required with --baseline-branch. Example: node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>'
        );
      }

      // In CI the positional may be a base build ID (e.g. "bk-BUILD_ID"). Resolve it to the
      // full composite (e.g. "bk-BUILD_ID::suite::model") so the server's exact-term query
      // on metadata.execution_id finds the scores.
      if (!targetExperimentId.includes('::')) {
        const resolved = await evalsClient.findLatestExperimentForBuild({
          suiteId,
          baseExecutionId: targetExperimentId,
          throwOnError: failOnRegression,
        });
        if (resolved) {
          log.info(`Resolved PR experiment: ${targetExperimentId} → ${resolved.executionId}`);
          targetExperimentId = resolved.executionId;
        } else {
          log.warning(`Could not resolve base ID "${targetExperimentId}"; using raw ID.`);
        }
      }

      // Extract model ID from the composite for model-matched baseline lookup,
      // so we don't compare haiku scores against a sonnet baseline (or vice versa).
      const taskModelId = targetExperimentId.includes('::')
        ? targetExperimentId.split('::').pop()
        : undefined;

      log.info(
        `Looking up latest baseline experiment for suite "${suiteId}" on branch "${baselineBranch}"${
          taskModelId ? ` (model: ${taskModelId})` : ''
        }...`
      );

      baselineMetadata = await evalsClient.findLatestBaselineExperiment({
        suiteId,
        branch: baselineBranch,
        taskModelId,
        excludeExecutionId: targetExperimentId,
        throwOnError: failOnRegression,
      });

      if (!baselineMetadata) {
        const message = `No baseline experiment found for suite ${suiteId} on branch ${baselineBranch}. Nothing to compare.`;
        // A missing baseline must not look like a clean pass in CI.
        if (failOnRegression) throw nothingToCompare(message);
        log.warning(message);
        return;
      }

      baselineExperimentId = baselineMetadata.executionId;
      log.info(`Found baseline experiment: ${baselineExperimentId}`);
    } else {
      [targetExperimentId, baselineExperimentId] = positionals;
      if (!targetExperimentId || !baselineExperimentId) {
        throw createFlagError(
          'Two experiment IDs are required (target first, baseline second). Example: node scripts/evals compare <target-experiment-id> <baseline-experiment-id>. Configure target Kibana with EVAL_KBN_URL and EVAL_KBN_API_KEY.'
        );
      }

      if (positionals.length > 2) {
        throw createFlagError('Unexpected extra arguments. Provide exactly two experiment IDs.');
      }

      // When --suite is set and a positional looks like a base build ID (no "::" composite
      // parts), resolve it to the full composite execution ID so the server's exact-term
      // metadata.execution_id query finds the scores. Build UUIDs are globally unique so
      // omitting a branch filter is safe.
      if (suiteId) {
        const resolveIfNeeded = async (id: string): Promise<string> => {
          if (id.includes('::')) return id;
          const resolved = await evalsClient.findLatestExperimentForBuild({
            suiteId,
            baseExecutionId: id,
            throwOnError: failOnRegression,
          });
          if (resolved) {
            log.info(`Resolved experiment ${id} → ${resolved.executionId}`);
            return resolved.executionId;
          }
          log.warning(`Could not resolve experiment for base ID "${id}"; using raw ID.`);
          return id;
        };

        [targetExperimentId, baselineExperimentId] = await Promise.all([
          resolveIfNeeded(targetExperimentId),
          resolveIfNeeded(baselineExperimentId),
        ]);

        if (format === 'markdown') {
          const baselineBaseId = baselineExperimentId.includes('::')
            ? baselineExperimentId.split('::')[0]
            : baselineExperimentId;
          // Only feeds the report header, so a failed lookup is logged by the client and skipped.
          baselineMetadata = await evalsClient.findLatestExperimentForBuild({
            suiteId,
            baseExecutionId: baselineBaseId,
          });
        }
      }
    }

    const targetFilter = suiteId ? { suiteId, executionId: targetExperimentId } : undefined;
    const baselineFilter = suiteId ? { suiteId, executionId: baselineExperimentId } : undefined;

    // Under the gate a failed request has to stay an error (exit 1): read as "no baseline" or "no
    // scores" it would turn an outage into an inconclusive gate. Without the gate the lookups keep
    // their log-and-continue behaviour.
    const readOptions = { throwOnError: failOnRegression };
    const [targetExperimentScores, baselineExperimentScores] = await Promise.all([
      evalsClient.getExperimentScores(targetExperimentId, targetFilter, readOptions),
      evalsClient.getExperimentScores(baselineExperimentId, baselineFilter, readOptions),
    ]);

    if (targetExperimentScores.length === 0) {
      throw nothingToCompare(`No scores found for experiment ID: ${targetExperimentId}`);
    }

    if (baselineExperimentScores.length === 0) {
      throw nothingToCompare(`No scores found for experiment ID: ${baselineExperimentId}`);
    }

    const targetExperimentDatasets = new Map(
      targetExperimentScores.map((score) => [score.example.dataset.id, score.example.dataset.name])
    );
    const baselineExperimentDatasets = new Map(
      baselineExperimentScores.map((score) => [
        score.example.dataset.id,
        score.example.dataset.name,
      ])
    );
    const overlappingDatasetIds = [...targetExperimentDatasets.keys()].filter((id) =>
      baselineExperimentDatasets.has(id)
    );

    if (overlappingDatasetIds.length === 0) {
      throw nothingToCompare('No overlapping datasets found between the two experiments.');
    }

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredTargetScores = targetExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredBaselineScores = baselineExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    // The gate pairs per example, not per repetition: repetitions of one example are not
    // independent, and counting them as pairs would inflate n for --min-pairs and shrink every
    // p-value. Without the gate, pairing stays per repetition so the report matches the evals UI and
    // compare route, which still pair that way.
    const averaged = failOnRegression
      ? averageMatchedRepetitions(filteredTargetScores, filteredBaselineScores)
      : undefined;
    const { pairs, skippedMissingPairs, skippedNullScores } = averaged
      ? pairScores(averaged.target, averaged.baseline)
      : pairScores(filteredTargetScores, filteredBaselineScores);

    if (pairs.length === 0) {
      throw nothingToCompare('No paired scores found between the two experiments.');
    }

    log.info(
      `Paired ${pairs.length} ${
        averaged ? 'example scores, repetitions averaged' : 'scores'
      } (skipped ${skippedMissingPairs} missing pairs, ${skippedNullScores} null scores).`
    );
    if (averaged && averaged.trimmedExamples > 0) {
      log.warning(
        `${averaged.trimmedExamples} example(s) had a different number of usable repetitions in the two runs; each was averaged over the count both runs have.`
      );
    }

    // Averaged repetitions are fractions like 1/3 whose differences tie only up to roundoff, so the
    // gated Wilcoxon rows are re-run with exact ties. The un-gated report keeps the shared result
    // (as the UI does), while its outcome label is signed from rounded differences.
    const comparisonResults = averaged
      ? retestWilcoxonWithExactTies(compareScores(pairs), pairs)
      : compareScores(pairs);
    if (comparisonResults.length === 0) {
      if (failOnRegression) throw nothingToCompare('No comparison results returned.');
      log.warning('No comparison results returned.');
      return;
    }

    if (regressionEvaluators) {
      const known = new Set(comparisonResults.map((result) => result.evaluatorName));
      const unknown = regressionEvaluators.filter((name) => !known.has(name));
      if (failOnRegression && unknown.length === regressionEvaluators.length) {
        // Every name missing means the gate would check nothing and pass vacuously. The flag is
        // well-formed, so this is a mismatch with the data (often a typo or the wrong suite).
        throw createFailError(
          `--regression-evaluators matches no evaluator in this comparison. Available: ${[...known]
            .sort()
            .join(', ')}`,
          { exitCode: GATE_INCONCLUSIVE_EXIT_CODE }
        );
      }
      if (unknown.length > 0) {
        // Partial mismatch is only a warning: one list may be shared across suites with different evaluators.
        log.warning(
          `--regression-evaluators names evaluator(s) not present in this comparison: ${unknown.join(
            ', '
          )}. Available: ${[...known].sort().join(', ')}`
        );
      }
    }

    // Holm runs over every comparison in this run (all datasets x evaluators), so the family is
    // the full set of hypotheses the report shows. Gate scoping does not shrink it: the gate is
    // judged on the same adjusted p-values the report prints.
    const results = attachEffectSigns(
      multiplicityCorrection ? applyHolmCorrection(comparisonResults) : comparisonResults,
      pairs
    );

    if (format === 'markdown') {
      const effectiveKibanaUrl = kibanaUrl ?? evaluationsKbnUrl;
      const comparePageUrl = effectiveKibanaUrl
        ? buildExecutionCompareUrl({
            kibanaUrl: effectiveKibanaUrl,
            spaceId: spaceIds?.[0],
            baselineExecutionId: baselineExperimentId,
            targetExecutionId: targetExperimentId,
          })
        : undefined;
      if (effectiveKibanaUrl && !comparePageUrl) {
        log.warning('Invalid Kibana URL for compare page link.');
      }

      const markdown = formatMarkdownCompareReport({
        targetExperimentId,
        baselineExperimentId,
        results,
        comparePageUrl,
        baselineTimestamp: baselineMetadata?.timestamp,
        baselineCommitSha: baselineMetadata?.gitCommitSha ?? undefined,
        refreshBaselineUrl: refreshUrl,
        skippedMissingPairs,
        skippedNullScores,
        baselineBranch: baselineBranch ?? undefined,
        regressionGate: failOnRegression
          ? { minPairs, evaluators: regressionEvaluators }
          : undefined,
      });

      if (outputPath) {
        Fs.appendFileSync(outputPath, markdown + '\n\n');
        log.info(`Markdown report appended to ${outputPath}`);
      } else {
        process.stdout.write(markdown + '\n');
      }
    } else {
      const report = formatCompareReport({
        targetExperimentId,
        baselineExperimentId,
        results,
      });

      log.info(`\n\n${report.header.join('\n')}`);
      log.info(`\n${report.summary}\n${report.tableOutput}`);
    }

    if (failOnRegression) {
      const decision = evaluateRegressionGate({
        results,
        minPairs,
        evaluators: regressionEvaluators,
      });
      const gateReport = formatRegressionGateReport({ decision, minPairs });

      if (decision.status === 'tripped') {
        throw createFailError(gateReport, { exitCode: GATE_REGRESSION_EXIT_CODE });
      }
      if (decision.status === 'inconclusive') {
        throw createFailError(gateReport, { exitCode: GATE_INCONCLUSIVE_EXIT_CODE });
      }
      log.info(gateReport);
    }
  },
} satisfies Command<void>;
