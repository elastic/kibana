/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams, SanitizedRule } from '@kbn/alerting-types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { partiallyUpdateRuleWithEs } from '../../saved_objects';

interface ClearExpiredMutedAlertsOpts {
  esClient: ElasticsearchClient;
  logger: Logger;
  rule: Pick<SanitizedRule<RuleTypeParams>, 'id' | 'mutedAlerts' | 'mutedInstanceIds'>;
  version?: string;
}

/**
 * Sweeps the `mutedAlerts` array on a rule saved object and removes entries
 * whose `expiresAt` timestamp is in the past. Also removes the corresponding
 * IDs from the legacy `mutedInstanceIds` array to keep both in sync.
 *
 * This runs during `prepareToRun` (before action scheduling) so that expired
 * time-based snoozes are cleaned up even when the snoozed alert does not fire
 * in the current execution cycle.
 */
export async function clearExpiredMutedAlerts(opts: ClearExpiredMutedAlertsOpts): Promise<void> {
  const { esClient, logger, rule, version } = opts;

  if (!rule.mutedAlerts || rule.mutedAlerts.length === 0) return;

  const now = Date.now();
  const expiredIds = new Set<string>();

  for (const entry of rule.mutedAlerts) {
    if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now) {
      expiredIds.add(entry.alertInstanceId);
    }
  }

  if (expiredIds.size === 0) return;

  const updatedMutedAlerts = rule.mutedAlerts.filter((e) => !expiredIds.has(e.alertInstanceId));
  const updatedMutedInstanceIds = (rule.mutedInstanceIds ?? []).filter(
    (id) => !expiredIds.has(id)
  );

  await partiallyUpdateRuleWithEs(
    esClient,
    rule.id,
    { mutedAlerts: updatedMutedAlerts, mutedInstanceIds: updatedMutedInstanceIds },
    { version, refresh: false }
  );

  for (const id of expiredIds) {
    logger.info(`Cleared expired muted alert '${id}' for rule '${rule.id}'`);
  }
}
