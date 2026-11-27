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
      --expect-scores  Fail the pin, before the baseline changes, unless it holds exactly this many scores
    `,
  },
  run: async ({ log, flagsReader }) => {
    const suiteId = flagsReader.string('suite');
    const executionId = flagsReader.string('execution-id');
    const reason = flagsReader.string('reason');
    // Parsed strictly from the raw string: FlagsReader.number would treat
    // `--expect-scores=` (an empty shell variable) as unset and accept numeric
    // prefixes like "20scores", both of which silently weaken the count guard.
    const expectedScoresRaw = flagsReader.string('expect-scores');
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();
    const pinnedBy =
      flagsReader.string('pinned-by') ??
      process.env.BUILDKITE_PIPELINE_SLUG ??
      process.env.USER ??
      undefined;

    if (!suiteId || !executionId) {
      throw createFlagError('--suite and --execution-id are required.');
    }
    let expectedScores: number | undefined;
    if (expectedScoresRaw !== undefined) {
      if (!/^[1-9][0-9]*$/.test(expectedScoresRaw.trim())) {
        throw createFlagError(
          `--expect-scores must be a positive integer, got "${expectedScoresRaw}".`
        );
      }
      expectedScores = Number(expectedScoresRaw.trim());
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

    // The expected count travels with the pin request: the route validates it before any
    // pointer is published, so a pin issued while score export was still in flight fails
    // without the active baseline ever changing.
    const baseline = await evalsClient.pinBaseline({
      suiteId,
      executionId,
      reason,
      pinnedBy,
      expectedScoreCount: expectedScores,
    });

    // A current route would have rejected a count mismatch before publishing, so a
    // success carrying a different count proves the server ignored the field — an older
    // route version that silently strips unknown body keys. Fail loudly instead of
    // reporting a count-guarded pin that was never guarded.
    if (expectedScores !== undefined && baseline.score_count !== expectedScores) {
      throw createFailError(
        `--expect-scores ${expectedScores} was not enforced: the pin succeeded with ` +
          `${baseline.score_count} score(s), so this evaluations cluster runs an older pin ` +
          `route that ignores expected_score_count. The registry now points at baseline ` +
          `${baseline.baseline_id}; pin a known-good execution to roll back, and upgrade ` +
          `the evaluations Kibana before relying on count-guarded pins.`
      );
    }

    if (expectedScores === undefined) {
      // Advisory only, and the lenient read contract ([] on failure) keeps it that way:
      // a failed live read must not turn a published baseline into a failed command.
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
