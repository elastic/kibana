/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../../services';
import { backfillPolicyBaseId } from '../../services/backfill_policy_base_id';

/**
 * Runs in the Fleet setup task rather than in the setup request, so that one Kibana at a time runs it
 * and the Fleet UI does not wait for it. It does not throw on a failed backfill: the task is then
 * removed, and scheduled again by the next Fleet setup, which continues where the backfill stopped.
 * A task that threw would stay failed after its attempts and never be scheduled again.
 */
export async function runBackfillPolicyBaseId(params: { signal: AbortSignal; logger: Logger }) {
  const esClient = appContextService.getInternalUserESClient();
  await backfillPolicyBaseId(esClient, params);
}
