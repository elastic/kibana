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
import { compareScores, pairScores } from '@kbn/evals-common';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import type { BaselineExperiment } from '../../utils/evals_client';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { getSpaceIdsFromEnv } from '../../utils/space_ids';
import { buildExecutionCompareUrl } from '../../utils/evals_ui_url';
import { readSpaceIdsFlag } from '../run_helpers';
import { formatCompareReport } from '../../utils/reporting/compare_report';
import { formatMarkdownCompareReport } from '../../utils/reporting/compare_markdown_report';

const DEFAULT_EVAL_KBN_URL = 'http://elastic:changeme@localhost:5601';

/**
 * The judge model a run's LLM evaluators scored with: the dominant
 * `evaluator.model.id` across LLM-kind scores. Mirrors the attribution the pin
 * route records on the baseline pointer.
 */
const resolveJudgeModelId = (scores: EvaluationScoreDocument[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const score of scores) {
    const modelId = score.evaluator.kind === 'llm' ? score.evaluator.model?.id : undefined;
    if (modelId) {
      counts.set(modelId, (counts.get(modelId) ?? 0) + 1);
    }
  }
  let winner: string | undefined;
  let winnerCount = 0;
  for (const [modelId, count] of counts) {
    if (count > winnerCount) {
      winner = modelId;
      winnerCount = count;
    }
  }
  return winner;
};

export const compareCmd: Command<void> = {
  name: 'compare',
  description: `
  Compare two evaluation experiments with a paired statistical test per dataset and evaluator.

  Usage modes:
    1. Direct comparison of two experiment IDs (target first, baseline second):
       node scripts/evals compare <target-experiment-id> <baseline-experiment-id>

    2. Auto-resolve baseline from a branch (for CI):
       node scripts/evals compare <experiment-id> --baseline-branch main --suite <suite-id>

    3. Compare against the pinned baseline (regression suites):
       node scripts/evals compare <experiment-id> --baseline-pinned --suite <suite-id>

  Options:
    --baseline-branch  Branch to find the latest baseline experiment on (e.g. "main")
    --baseline-pinned  Compare against the suite's pinned baseline (see "evals pin-baseline")
    --suite            Suite ID filter for baseline lookup and score filtering
    --format           Output format: "terminal" (default) or "markdown"
    --kibana-url       Kibana URL for generating compare page links in markdown
    --output           Append markdown output to a file instead of stdout
    --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
    --space-ids        Spaces the experiments were run in (same value as "evals run")

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
    ],
    boolean: ['baseline-pinned'],
    help: `
      --baseline-branch  Branch to find the latest baseline experiment on
      --baseline-pinned  Compare against the suite's pinned baseline instead of a branch run
      --suite            Suite ID filter for baseline lookup and score filtering
      --format           Output format: "terminal" (default) or "markdown"
      --kibana-url       Kibana URL for generating compare page links in markdown
      --output           Append markdown output to a file instead of stdout
      --refresh-url      URL to include as a "Refresh Baseline" link in markdown output
      --space-ids        Spaces the experiments were run in
    `,
  },
  run: async ({ log, flagsReader }) => {
    const positionals = flagsReader.getPositionals();
    const baselineBranch = flagsReader.string('baseline-branch');
    const baselinePinned = flagsReader.boolean('baseline-pinned');
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

    if (baselinePinned && baselineBranch) {
      throw createFlagError('--baseline-pinned and --baseline-branch are mutually exclusive.');
    }

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

      const taskModelId = targetExperimentId.includes('::')
        ? targetExperimentId.split('::').pop()
        : undefined;

      log.info(
        `Looking up pinned baseline for suite "${suiteId}"${
          taskModelId ? ` (model: ${taskModelId})` : ''
        }...`
      );

      const pinned = await evalsClient.findLatestPinnedBaseline({ suiteId, taskModelId });
      if (!pinned) {
        log.warning(
          `No pinned baseline found for suite ${suiteId}${
            taskModelId ? ` and model ${taskModelId}` : ''
          }. Seed one with: node scripts/evals pin-baseline --suite ${suiteId} --execution-id <id>`
        );
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

    const [targetExperimentScores, baselineExperimentScores] = await Promise.all([
      evalsClient.getExperimentScores(targetExperimentId, targetFilter),
      // A pinned baseline's scores live in the pinned-baselines snapshot, which
      // outlives the retention on the scores data stream.
      pinnedBaselineId
        ? evalsClient.getPinnedBaselineScores(pinnedBaselineId)
        : evalsClient.getExperimentScores(baselineExperimentId, baselineFilter),
    ]);

    // Scores from different judges are not comparable: refuse the comparison instead of
    // gating on garbage. The dominant LLM-evaluator model identifies each side's judge.
    if (pinnedJudgeModelId) {
      const targetJudgeModelId = resolveJudgeModelId(targetExperimentScores);
      if (targetJudgeModelId && targetJudgeModelId !== pinnedJudgeModelId) {
        const message =
          `Judge mismatch: the pinned baseline was scored by "${pinnedJudgeModelId}" but this run ` +
          `was scored by "${targetJudgeModelId}". The comparison is invalid — re-run with the pinned ` +
          `judge, or pin a new baseline under the new judge.`;
        log.error(message);
        if (format === 'markdown' && outputPath) {
          Fs.appendFileSync(
            outputPath,
            `### ⚠️ Comparison invalid: judge mismatch\n\n${message}\n\n`
          );
        }
        return;
      }
    }

    if (targetExperimentScores.length === 0) {
      throw new Error(`No scores found for experiment ID: ${targetExperimentId}`);
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

    log.info(`Found ${overlappingDatasetIds.length} overlapping dataset(s).`);

    const overlappingDatasetSet = new Set(overlappingDatasetIds);
    const filteredTargetScores = targetExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );
    const filteredBaselineScores = baselineExperimentScores.filter((score) =>
      overlappingDatasetSet.has(score.example.dataset.id)
    );

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      filteredTargetScores,
      filteredBaselineScores
    );

    if (pairs.length === 0) {
      throw new Error('No paired scores found between the two experiments.');
    }

    log.info(
      `Paired ${pairs.length} scores (skipped ${skippedMissingPairs} missing pairs, ${skippedNullScores} null scores).`
    );

    const results = compareScores(pairs);
    if (results.length === 0) {
      log.warning('No comparison results returned.');
      return;
    }

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
  },
};
