/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import {
  EvalsClient,
  getEvaluationsKbnClient,
  getSpaceIdsFromEnv,
  readSpaceIdsFlag,
} from '@kbn/evals';

const DEFAULT_EVAL_KBN_URL = 'http://elastic:changeme@localhost:5601';

export const pinBaselineCmd: Command<void> = {
  name: 'pin-baseline',
  description: `
  Pin an evaluation execution as the regression baseline for its suite and task model.

  The execution's scores are snapshotted into the pinned-baselines registry on the
  evaluations cluster (365-day retention), and the new pointer becomes the baseline that
  "evals compare --baseline-pinned" resolves. Pinning an already-pinned execution
  re-promotes its stored snapshot, which rolls the active baseline back to it. Intended
  for the scheduled baseline pipeline; run it manually to bless a specific run after an
  intentional change.

  Usage:
    node scripts/evals ext pin-baseline --suite <suite-id> --execution-id <composite-id> [--reason "..."]

  Environment:
    EVAL_KBN_URL      Target Kibana URL (defaults to localhost)
    EVAL_KBN_API_KEY  API key for authenticating to the target Kibana
    EVAL_SPACE_IDS    Spaces the experiment was run in (same as "evals run")
  `,
  flags: {
    string: ['suite', 'execution-id', 'reason', 'pinned-by', 'space-ids', 'expect-scores'],
    help: `
      --suite          Suite ID the execution belongs to (required)
      --execution-id   Composite execution ID to pin, e.g. "bk-BUILD::suite::model" (required)
      --reason         Why this run is being pinned (recorded on the pointer)
      --pinned-by      Who/what pinned it (defaults to USER or the CI pipeline slug)
      --space-ids      Spaces the experiment was run in
      --expect-scores  Fail unless the pinned snapshot holds exactly this many scores
    `,
  },
  run: async ({ log, flagsReader }) => {
    const suiteId = flagsReader.string('suite');
    const executionId = flagsReader.string('execution-id');
    const reason = flagsReader.string('reason');
    const expectedScores = flagsReader.number('expect-scores');
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();
    const pinnedBy =
      flagsReader.string('pinned-by') ??
      process.env.BUILDKITE_PIPELINE_SLUG ??
      process.env.USER ??
      undefined;

    if (!suiteId || !executionId) {
      throw createFlagError('--suite and --execution-id are required.');
    }
    if (
      expectedScores !== undefined &&
      (!Number.isInteger(expectedScores) || expectedScores <= 0)
    ) {
      throw createFlagError('--expect-scores must be a positive integer.');
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

    const baseline = await evalsClient.pinBaseline({
      suiteId,
      executionId,
      reason,
      pinnedBy,
    });

    // Verify the snapshot is complete before trusting it as the baseline: a pin issued
    // while score export was still in flight would bless a partial run. The pipeline
    // passes the count it exported; without it, the live scores are the expectation.
    if (expectedScores !== undefined && baseline.score_count !== expectedScores) {
      throw createFailError(
        `Pinned baseline ${baseline.baseline_id} holds ${baseline.score_count} score(s), but ` +
          `${expectedScores} were expected. The run may not have finished exporting scores ` +
          `before the pin; re-pin once the export completed.`
      );
    }
    if (expectedScores === undefined) {
      const liveScores = await evalsClient.getExperimentScores(executionId, {
        suiteId,
        executionId,
      });
      if (liveScores.length > 0 && liveScores.length !== baseline.score_count) {
        log.warning(
          `The execution has ${liveScores.length} live score(s) but the pinned snapshot holds ` +
            `${baseline.score_count}. A re-pin promotes the stored snapshot untouched; if the ` +
            `live scores are the intended baseline, pin a fresh execution instead.`
        );
      }
    }

    log.info(
      [
        `Pinned baseline ${baseline.baseline_id} for suite "${baseline.suite_id}"`,
        `  execution: ${baseline.execution_id}`,
        `  task model: ${baseline.task_model?.id ?? 'unknown'}`,
        `  judge model: ${baseline.judge_model_id ?? 'unknown'}`,
        `  scores snapshotted: ${baseline.score_count}`,
        `  datasets: ${(baseline.dataset_ids ?? []).join(', ')}`,
      ].join('\n')
    );
  },
};
