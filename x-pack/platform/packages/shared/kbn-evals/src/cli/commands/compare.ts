/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import {
  compareScores,
  pairScores,
  evaluateRegressionGates,
  DEFAULT_REGRESSION_GATES,
  RepetitionPolicy,
  type RegressionGateConfig,
} from '@kbn/evals-common';
import type { BaselineExperiment } from '../../utils/evals_client';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { getSpaceIdsFromEnv } from '../../utils/space_ids';
import { buildExecutionCompareUrl } from '../../utils/evals_ui_url';
import { readSpaceIdsFlag } from '../run_helpers';
import { formatCompareReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';
import {
  parseGateConfig,
  findJudgeMismatch,
  formatGateReportMarkdown,
  logGateReport,
} from './regression_verdict';

const DEFAULT_EVAL_KBN_URL = 'http://elastic:changeme@localhost:5601';

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation experiments with a paired statistical test per dataset and evaluator.

  Usage modes:
    1. Direct comparison of two experiment IDs (target first, baseline second):
       node scripts/evals compare <target-experiment-id> <baseline-experiment-id>

    2. Auto-resolve baseline from a branch (for CI):
       node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>

    3. Compare against the pinned baseline with a regression verdict (regression suites):
       node scripts/evals compare <experiment-id> --baseline-pinned --suite <suite-id>

  Options:
    --baseline-branch  Branch to find the latest baseline experiment on (e.g. "main")
    --baseline-pinned  Compare against the suite's pinned baseline (see "evals ext pin-baseline")
    --gates            Path to a JSON file overriding the default regression gate thresholds
    --suite            Suite ID filter for baseline lookup and score filtering
    --format           Output format: "terminal" (default) or "markdown"
    --kibana-url       Kibana URL for generating compare page links in markdown
    --output           Append markdown output to a file instead of stdout
    --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
    --space-ids        Spaces the experiments were run in (same value as "evals run")
    --repetition-policy  How repetitions of one example are compared: "mean" (default) or "median"

  Environment:
    EVAL_KBN_URL      Target Kibana URL (defaults to localhost)
    EVAL_KBN_API_KEY  API key for authenticating to the target Kibana
    EVAL_SPACE_IDS    Spaces the experiments were run in (same as --space-ids)
  `,
  flags: {
    string: [
      'baseline-branch',
      'gates',
      'suite',
      'format',
      'kibana-url',
      'output',
      'refresh-url',
      'space-ids',
      'repetition-policy',
    ],
    boolean: ['baseline-pinned'],
    help: `
      --baseline-branch  Branch to find the latest baseline experiment on
      --baseline-pinned  Compare against the suite's pinned baseline instead of a branch run
      --gates            Path to a JSON file overriding the default regression gate thresholds
      --suite            Suite ID filter for baseline lookup and score filtering
      --format           Output format: "terminal" (default) or "markdown"
      --kibana-url       Kibana URL for generating compare page links in markdown
      --output           Append markdown output to a file instead of stdout
      --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
      --space-ids        Spaces the experiments were run in
      --repetition-policy  "mean" (default) or "median" of each example's repetitions
    `,
  },
  run: async ({ log, flagsReader }) => {
    const positionals = flagsReader.getPositionals();
    const baselineBranch = flagsReader.string('baseline-branch');
    const baselinePinned = flagsReader.boolean('baseline-pinned');
    const gatesPath = flagsReader.string('gates');
    const suiteId = flagsReader.string('suite');
    const format = flagsReader.string('format') ?? 'terminal';
    const kibanaUrl = flagsReader.string('kibana-url');
    const outputPath = flagsReader.string('output');
    const refreshUrl = flagsReader.string('refresh-url');
    // Scores are only readable from the spaces they were ingested into, so a
    // comparison has to be made from where the runs put them.
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();

    if (format !== 'terminal' && format !== 'markdown') {
      throw createFlagError('--format must be "terminal" or "markdown".');
    }

    const parsedPolicy = RepetitionPolicy.safeParse(
      flagsReader.string('repetition-policy') ?? 'mean'
    );
    if (!parsedPolicy.success) {
      throw createFlagError('--repetition-policy must be "mean" or "median".');
    }
    const repetitionPolicy = parsedPolicy.data;

    if (baselinePinned && baselineBranch) {
      throw createFlagError('--baseline-pinned and --baseline-branch are mutually exclusive.');
    }
    if (gatesPath && !baselinePinned) {
      throw createFlagError('--gates only applies with --baseline-pinned.');
    }

    let gateConfig: RegressionGateConfig = DEFAULT_REGRESSION_GATES;
    if (gatesPath) {
      try {
        gateConfig = parseGateConfig(Fs.readFileSync(gatesPath, 'utf-8'));
      } catch (error) {
        throw createFlagError(
          `Could not read gate thresholds from "${gatesPath}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Skipped or invalid pinned comparisons still produce a PR-visible markdown note
    // through the same stdout-or-file path as a completed one: the shell that builds the
    // PR comment treats "no output" as "nothing to post", which would hide the skip.
    const emitMarkdownNote = (heading: string, message: string): void => {
      if (format !== 'markdown') {
        return;
      }
      const content = `### ${heading}\n\n${message}\n\n`;
      if (outputPath) {
        Fs.appendFileSync(outputPath, content);
        log.info(`Markdown report appended to ${outputPath}`);
      } else {
        process.stdout.write(content);
      }
    };

    // An aborted comparison must stay distinguishable from a completed report-only
    // verdict: in markdown mode the note is the PR-visible outcome and the command exits
    // cleanly, but in terminal mode there is no comment to carry it, so the command
    // fails for callers to see that no verdict was computed.
    const abortComparison = (heading: string, message: string): void => {
      log.error(message);
      if (format !== 'markdown') {
        throw createFailError(message);
      }
      emitMarkdownNote(heading, message);
    };

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
    let pinnedBaselineId: string | undefined;
    let pinnedJudgeModelId: string | null | undefined;

    if (baselinePinned) {
      if (!suiteId) {
        throw createFlagError('--suite is required when using --baseline-pinned.');
      }

      targetExperimentId = positionals[0];
      if (!targetExperimentId) {
        throw createFlagError(
          'One experiment ID is required with --baseline-pinned. Example: node scripts/evals compare <experiment-id> --baseline-pinned --suite <suite-id>'
        );
      }

      // Same base-build-ID resolution as the branch mode (see below).
      if (!targetExperimentId.includes('::')) {
        const resolved = await evalsClient.findLatestExperimentForBuild({
          suiteId,
          baseExecutionId: targetExperimentId,
        });
        if (resolved) {
          log.info(`Resolved PR experiment: ${targetExperimentId} → ${resolved.executionId}`);
          targetExperimentId = resolved.executionId;
        } else {
          log.warning(`Could not resolve base ID "${targetExperimentId}"; using raw ID.`);
        }
      }

      // The registry pins one baseline per (suite, task model): without the model segment
      // the lookup would return the newest pin for ANY model in the suite, and the verdict
      // could compare different task models. Refuse instead.
      if (!targetExperimentId.includes('::')) {
        const message =
          `Cannot determine the task model from execution ID \`${targetExperimentId}\`: a pinned ` +
          `baseline is resolved per task model. Pass the full composite execution ID ` +
          `(\`bk-BUILD::suite::model\`).`;
        abortComparison('⚠️ Pinned-baseline comparison skipped', message);
        return;
      }
      const taskModelId = targetExperimentId.split('::').pop();

      log.info(`Looking up pinned baseline for suite "${suiteId}" (model: ${taskModelId})...`);

      let pinned;
      try {
        pinned = await evalsClient.findLatestPinnedBaseline({ suiteId, taskModelId });
      } catch (error) {
        // A broken registry must still leave a PR-visible trace: the comment step treats a
        // clean exit with no markdown as "nothing to post", hiding that no verdict exists.
        const message = `The pinned-baseline registry could not be reached: ${
          error instanceof Error ? error.message : String(error)
        }`;
        abortComparison('⚠️ Pinned-baseline comparison unavailable', message);
        return;
      }
      if (!pinned) {
        const message =
          `No pinned baseline found for suite \`${suiteId}\` and model \`${taskModelId}\`. ` +
          `Seed one from a green run on main: \`node scripts/evals ext pin-baseline --suite ${suiteId} --execution-id <id>\``;
        log.warning(message);
        emitMarkdownNote('ℹ️ No pinned baseline', message);
        return;
      }

      pinnedBaselineId = pinned.baseline_id;
      pinnedJudgeModelId = pinned.judge_model_id;
      baselineExperimentId = pinned.execution_id;
      baselineMetadata = {
        executionId: pinned.execution_id,
        timestamp: pinned.pinned_at,
        gitCommitSha: pinned.git_commit_sha ?? null,
        gitBranch: pinned.git_branch ?? null,
      };
      log.info(
        `Found pinned baseline ${pinned.baseline_id} (execution ${pinned.execution_id}, pinned at ${pinned.pinned_at})`
      );
    } else if (baselineBranch) {
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
      });

      if (!baselineMetadata) {
        log.warning(
          `No baseline experiment found for suite ${suiteId} on branch ${baselineBranch}. Nothing to compare.`
        );
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
          baselineMetadata = await evalsClient.findLatestExperimentForBuild({
            suiteId,
            baseExecutionId: baselineBaseId,
          });
        }
      }
    }

    const targetFilter = suiteId ? { suiteId, executionId: targetExperimentId } : undefined;
    const baselineFilter = suiteId ? { suiteId, executionId: baselineExperimentId } : undefined;

    let targetExperimentScores;
    let baselineExperimentScores;
    try {
      [targetExperimentScores, baselineExperimentScores] = await Promise.all([
        evalsClient.getExperimentScores(targetExperimentId, targetFilter),
        // A pinned baseline's scores live in the pinned-baselines snapshot, which
        // outlives the retention on the scores data stream.
        pinnedBaselineId
          ? evalsClient.getPinnedBaselineScores(pinnedBaselineId)
          : evalsClient.getExperimentScores(baselineExperimentId, baselineFilter),
      ]);
    } catch (error) {
      if (!pinnedBaselineId) {
        throw error;
      }
      const message = `The pinned baseline's scores could not be read: ${
        error instanceof Error ? error.message : String(error)
      }`;
      abortComparison('⚠️ Pinned-baseline comparison unavailable', message);
      return;
    }

    // An empty target is a missing-run problem, not a judge problem: handle it before
    // the judge match, or a run that exported nothing would be reported as a judge
    // mismatch and point reviewers at the baseline instead of at the missing scores.
    if (targetExperimentScores.length === 0) {
      if (pinnedBaselineId) {
        abortComparison(
          '⚠️ Pinned-baseline comparison unavailable',
          `No scores found for this run (execution \`${targetExperimentId}\`). The run may ` +
            `have failed before exporting scores, or the execution ID resolved incorrectly.`
        );
        return;
      }
      throw new Error(`No scores found for experiment ID: ${targetExperimentId}`);
    }

    // Scores from different judges are not comparable: refuse the comparison instead of
    // gating on garbage. The pin route rejects mixed-judge executions, so the baseline
    // side is a single judge (or judge-less); the target side must match it exactly.
    if (pinnedBaselineId) {
      const mismatch = findJudgeMismatch({
        baselineJudgeModelId: pinnedJudgeModelId,
        targetScores: targetExperimentScores,
      });
      if (mismatch) {
        abortComparison('⚠️ Comparison invalid: judge mismatch', mismatch);
        return;
      }
    }

    if (baselineExperimentScores.length === 0) {
      throw new Error(`No scores found for experiment ID: ${baselineExperimentId}`);
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
      throw new Error('No overlapping datasets found between the two experiments.');
    }

    // Baseline datasets with no counterpart in this run never reach the gates: name them
    // and qualify the verdict rather than reporting an unqualified "no regression".
    const missingBaselineDatasets = pinnedBaselineId
      ? [...baselineExperimentDatasets]
          .filter(([id]) => !targetExperimentDatasets.has(id))
          .map(([, name]) => name)
          .sort()
      : [];

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredTargetScores = targetExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredBaselineScores = baselineExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    const { pairs, skippedMissingPairs, skippedNullScores, rejectedSlices, repetitions } =
      pairScores(filteredTargetScores, filteredBaselineScores, repetitionPolicy);

    const rejectedNames = rejectedSlices.map((s) => `${s.datasetName} / ${s.evaluatorName}`);
    if (pairs.length === 0 && rejectedSlices.length > 0) {
      throw createFlagError(
        `--repetition-policy median needs scores in [0, 1]. Every paired slice has a score outside that range: ${rejectedNames.join(
          ', '
        )}.`
      );
    }

    if (pairs.length === 0) {
      throw new Error('No paired scores found between the two experiments.');
    }

    log.info(
      `Built ${pairs.length} pairs with repetition policy "${repetitionPolicy}" (skipped ${skippedMissingPairs} unpaired, ${skippedNullScores} null scores).`
    );
    if (rejectedSlices.length > 0) {
      log.warning(
        `Left out of the median comparison (score outside [0, 1]): ${rejectedNames.join(', ')}.`
      );
    }

    const results = compareScores(pairs, repetitions);
    if (results.length === 0) {
      log.warning('No comparison results returned.');
      return;
    }

    // The regression decision, only against a pinned baseline: a branch-mode baseline is
    // whatever happened to run last, not a reference anyone promoted. Report-only —
    // verdicts never change the exit code until the suite's noise floor is known.
    const gateReport = pinnedBaselineId ? evaluateRegressionGates(results, gateConfig) : undefined;
    if (gateReport) {
      logGateReport(log, gateReport, { missingBaselineDatasets });
    }

    if (format === 'markdown') {
      const effectiveKibanaUrl = kibanaUrl ?? evaluationsKbnUrl;
      // The UI comparison page reads live scores only: a pinned baseline's execution may
      // have aged out of the scores retention, so the link would 404. Omit it.
      const comparePageUrl =
        effectiveKibanaUrl && !pinnedBaselineId
          ? buildExecutionCompareUrl({
              kibanaUrl: effectiveKibanaUrl,
              spaceId: spaceIds?.[0],
              baselineExecutionId: baselineExperimentId,
              targetExecutionId: targetExperimentId,
              repetitionPolicy,
            })
          : undefined;
      if (effectiveKibanaUrl && !pinnedBaselineId && !comparePageUrl) {
        log.warning('Invalid Kibana URL for compare page link.');
      }

      const verdictMarkdown = gateReport
        ? formatGateReportMarkdown(gateReport, { missingBaselineDatasets }) + '\n\n'
        : '';
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
        repetitionPolicy,
        rejectedSlices: rejectedNames,
        pinnedBaseline: Boolean(pinnedBaselineId),
      });

      if (outputPath) {
        Fs.appendFileSync(outputPath, verdictMarkdown + markdown + '\n\n');
        log.info(`Markdown report appended to ${outputPath}`);
      } else {
        process.stdout.write(verdictMarkdown + markdown + '\n');
      }
    } else {
      const report = formatCompareReport({
        targetExperimentId,
        baselineExperimentId,
        results,
        repetitionPolicy,
      });

      log.info(`\n\n${report.header.join('\n')}`);
      log.info(`\n${report.summary}\n${report.tableOutput}`);
    }
  },
};
