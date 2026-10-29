/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { KbnClient } from '@kbn/kbn-client';
import { EvalsClient } from '../../utils/evals_client';
import { getEvaluationsKbnClient } from '../../utils/evaluations_kbn_client';
import { getSpaceIdsFromEnv } from '../../utils/space_ids';
import { readSpaceIdsFlag } from '../run_helpers';

const DEFAULT_EVAL_KBN_URL = 'http://elastic:changeme@localhost:5601';

export const pinBaselineCmd: Command<void> = {
  name: 'pin-baseline',
  description: `
  Pin an evaluation execution as the regression baseline for its suite and task model.

  The execution's scores are snapshotted into the pinned-baselines index on the
  evaluations cluster (no retention), and the new pointer becomes the baseline that
  "evals compare --baseline-pinned" resolves. Intended for the scheduled baseline
  pipeline; run it manually to bless a specific run after an intentional change.

  Usage:
    node scripts/evals pin-baseline --suite <suite-id> --execution-id <composite-id> [--reason "..."]

  Environment:
    EVAL_KBN_URL      Target Kibana URL (defaults to localhost)
    EVAL_KBN_API_KEY  API key for authenticating to the target Kibana
    EVAL_SPACE_IDS    Spaces the experiment was run in (same as "evals run")
  `,
  flags: {
    string: ['suite', 'execution-id', 'reason', 'pinned-by', 'space-ids'],
    help: `
      --suite         Suite ID the execution belongs to (required)
      --execution-id  Composite execution ID to pin, e.g. "bk-BUILD::suite::model" (required)
      --reason        Why this run is being pinned (recorded on the pointer)
      --pinned-by     Who/what pinned it (defaults to USER or the CI pipeline slug)
      --space-ids     Spaces the experiment was run in
    `,
  },
  run: async ({ log, flagsReader }) => {
    const suiteId = flagsReader.string('suite');
    const executionId = flagsReader.string('execution-id');
    const reason = flagsReader.string('reason');
    const spaceIds = readSpaceIdsFlag(flagsReader) ?? getSpaceIdsFromEnv();
    const pinnedBy =
      flagsReader.string('pinned-by') ??
      process.env.BUILDKITE_PIPELINE_SLUG ??
      process.env.USER ??
      undefined;

    if (!suiteId || !executionId) {
      throw createFlagError('--suite and --execution-id are required.');
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
