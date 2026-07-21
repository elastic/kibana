/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import {
  AGENT_POLICY_INDEX,
  AGENTS_INDEX,
  AGENT_POLICY_VERSION_SEPARATOR,
} from '../../common/constants';

import { appContextService, settingsService } from '.';

// Painless: strip version suffix from policy_id and store as policy_base_id.
// Skips documents that already have policy_base_id set (idempotent).
// The separator character is passed via params.separator to avoid hard-coding it.
const BACKFILL_SCRIPT = `
  if (ctx._source.policy_id == null ||
      (ctx._source.containsKey('policy_base_id') && ctx._source.policy_base_id != null)) {
    ctx.op = 'noop';
    return;
  }
  String pid = ctx._source.policy_id;
  int idx = pid.lastIndexOf(params.separator);
  ctx._source.policy_base_id = idx >= 0 ? pid.substring(0, idx) : pid;
`.trim();

async function runBackfill(esClient: ElasticsearchClient, index: string, label: string) {
  const logger = appContextService.getLogger();
  try {
    const result = await esClient.updateByQuery({
      index,
      conflicts: 'proceed',
      script: {
        lang: 'painless',
        source: BACKFILL_SCRIPT,
        params: { separator: AGENT_POLICY_VERSION_SEPARATOR },
      },
      query: {
        bool: {
          must: [{ exists: { field: 'policy_id' } }],
          must_not: [{ exists: { field: 'policy_base_id' } }],
        },
      },
    });
    logger.debug(
      `Backfilled policy_base_id on ${result.updated ?? 0} ${label} documents (${
        result.noops ?? 0
      } noops)`
    );
  } catch (err) {
    logger.warn(
      `Failed to backfill policy_base_id on ${label}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    throw err;
  }
}

export async function backfillPolicyBaseId(esClient: ElasticsearchClient) {
  await Promise.all([
    runBackfill(esClient, AGENTS_INDEX, 'fleet-agents'),
    runBackfill(esClient, AGENT_POLICY_INDEX, 'fleet-policies'),
  ]);
}

const MIGRATION_KEY = 'policy_base_id_backfill';

export async function runPolicyBaseIdBackfillIfNeeded(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
) {
  const logger = appContextService.getLogger();
  const settings = await settingsService.getSettings(soClient);
  if (settings.completed_migrations?.includes(MIGRATION_KEY)) {
    return;
  }
  logger.debug('Backfilling policy_base_id on fleet-agents and fleet-policies');
  await backfillPolicyBaseId(esClient);
  await settingsService.saveSettings(soClient, {
    completed_migrations: [...new Set([...(settings.completed_migrations ?? []), MIGRATION_KEY])],
  });
}
