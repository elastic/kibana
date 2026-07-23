/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  AGENT_POLICY_INDEX,
  AGENTS_INDEX,
  AGENT_POLICY_VERSION_SEPARATOR,
} from '../../common/constants';

import { appContextService } from '.';

// Painless: strip version suffix from policy_id and store as policy_base_id.
// Mirrors removeVersionSuffixFromPolicyId: only strips when the segment after the last
// separator looks like a version (digits.digits). Painless regex is off by default so
// we use a plain digit walk instead. Skips docs that already have policy_base_id (idempotent).
const BACKFILL_SCRIPT = `
  if (ctx._source.policy_id == null ||
      (ctx._source.containsKey('policy_base_id') && ctx._source.policy_base_id != null)) {
    ctx.op = 'noop';
    return;
  }
  String pid = ctx._source.policy_id;
  int sepIdx = pid.lastIndexOf(params.separator);
  if (sepIdx >= 0) {
    String suffix = pid.substring(sepIdx + 1);
    int dotIdx = suffix.indexOf('.');
    boolean isVersion = dotIdx > 0 && suffix.length() > dotIdx + 1;
    if (isVersion) {
      for (int i = 0; i < suffix.length(); i++) {
        if (i != dotIdx && !Character.isDigit(suffix.charAt(i))) { isVersion = false; break; }
      }
    }
    ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
  } else {
    ctx._source.policy_base_id = pid;
  }
`.trim();

async function runBackfill(esClient: ElasticsearchClient, index: string, label: string) {
  const logger = appContextService.getLogger();
  try {
    const result = await esClient.updateByQuery({
      index,
      ignore_unavailable: true,
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
