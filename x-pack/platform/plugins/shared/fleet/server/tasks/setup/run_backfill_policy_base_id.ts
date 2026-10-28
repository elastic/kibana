/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../services';
import { backfillPolicyBaseId } from '../../services/backfill_policy_base_id';

// Pause between a run that ran out of its time budget and the next one, so that the cluster is not
// loaded back to back
export const BACKFILL_CONTINUE_DELAY_MS = 60 * 1000;

/**
 * Runs in the Fleet setup task rather than in the setup request, so that one Kibana at a time runs it
 * and the Fleet UI does not wait for it.
 *
 * A run that updated documents but did not finish (`partial`, or `failed` after some progress)
 * schedules the next run itself, by returning a `runAt`, rather than waiting for a Fleet setup: a
 * setup may not come, or may be rejected before it schedules tasks. Every rescheduled run followed
 * progress, and the documents to update are finite, so the runs end. A run that made no progress is
 * not rescheduled here, which would repeat it forever on a permanent error.
 *
 * It does not throw on a failed backfill: the task is then removed, and scheduled again by the next
 * Fleet setup, which continues where the backfill stopped. A task that threw would stay failed after
 * its attempts and never be scheduled again.
 */
export async function runBackfillPolicyBaseId(params: { signal: AbortSignal; logger: Logger }) {
  const esClient = appContextService.getInternalUserESClient();
  const results = await backfillPolicyBaseId(esClient, params);

  const hasProgressToContinue = results.some(
    ({ status, updated }) => status !== 'completed' && updated > 0
  );
  if (hasProgressToContinue && !params.signal.aborted) {
    return { state: {}, runAt: new Date(Date.now() + BACKFILL_CONTINUE_DELAY_MS) };
  }
}
