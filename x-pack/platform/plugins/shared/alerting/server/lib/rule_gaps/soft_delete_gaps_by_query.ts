/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import { GAP_DELETED_FIELD, GAP_EVENT_ACTION, GAP_EVENT_PROVIDER } from './constants';

// Chunk rule IDs to stay well below `index.max_terms_count` (default 65,536)
// when building the `terms` filter.
const MAX_RULE_IDS_PER_QUERY = 10_000;

// `conflicts: 'proceed'` skips version-conflicted documents instead of retrying
// them, and nothing re-runs this cleanup once the rule is gone. Gap documents
// are mutable — fill status and in-progress intervals change — so a conflict
// during deletion is plausible. One extra pass converges, and the `must_not`
// clause keeps it cheap.
const MAX_CONFLICT_RETRIES = 1;

// Long enough for the default 1s index refresh to make the first pass visible,
// so the retry is not re-matching documents it already updated.
const CONFLICT_RETRY_DELAY_MS = 2_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SoftDeleteGapsByQueryParams {
  ruleIds: string[];
  eventLogClient: IEventLogClient;
  logger: Logger;
}

const buildGapQuery = (ruleIds: string[]): estypes.QueryDslQueryContainer => ({
  bool: {
    must: [
      { term: { 'event.action': GAP_EVENT_ACTION } },
      { term: { 'event.provider': GAP_EVENT_PROVIDER } },
      { terms: { 'rule.id': ruleIds } },
    ],
    must_not: [{ term: { [GAP_DELETED_FIELD]: true } }],
  },
});

// `noops` counts documents the null-safe script skipped because they carry no
// gap object, so it is expected rather than a problem.
const describeResponse = (response: estypes.UpdateByQueryResponse): string =>
  [
    `took=${response.took ?? 0}ms`,
    `total=${response.total ?? 0}`,
    `updated=${response.updated ?? 0}`,
    `noops=${response.noops ?? 0}`,
    `version_conflicts=${response.version_conflicts ?? 0}`,
    `failures=${response.failures?.length ?? 0}`,
    `bulk_retries=${response.retries?.bulk ?? 0}`,
    `timed_out=${response.timed_out ?? false}`,
  ].join(' ');

const isIncomplete = (response: estypes.UpdateByQueryResponse): boolean =>
  Boolean(response.timed_out) ||
  Boolean(response.failures?.length) ||
  Boolean(response.version_conflicts);

const softDeleteChunk = async ({
  ruleIdChunk,
  eventLogClient,
  logger,
}: {
  ruleIdChunk: string[];
  eventLogClient: IEventLogClient;
  logger: Logger;
}): Promise<void> => {
  for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
    const response = await withSpan(
      { name: 'softDeleteGapsByQuery.softDeleteByQuery', type: 'rule' },
      () =>
        eventLogClient.softDeleteByQuery({
          field: GAP_DELETED_FIELD,
          query: buildGapQuery(ruleIdChunk),
        })
    );

    const summary = `${ruleIdChunk.length} rules (${describeResponse(response)})`;

    if (!isIncomplete(response)) {
      logger.debug(`softDeleteGapsByQuery: soft-deleted gaps for ${summary}`);
      return;
    }

    if (!response.version_conflicts || attempt === MAX_CONFLICT_RETRIES) {
      logger.warn(`softDeleteGapsByQuery: soft-deleted gaps with issues for ${summary}`);
      return;
    }

    logger.debug(`softDeleteGapsByQuery: retrying version conflicts for ${summary}`);
    await delay(CONFLICT_RETRY_DELAY_MS);
  }
};

/**
 * Soft-deletes every non-deleted gap document for the given rule IDs through the
 * event log client. Owns the gap-domain query and the `terms` chunking. Rule IDs
 * are globally unique, so gaps are matched by `rule.id` alone (intentionally
 * cross-space). Best-effort: per-chunk failures are logged and swallowed so gap
 * cleanup never blocks rule deletion.
 */
export const softDeleteGapsByQuery = async ({
  ruleIds,
  eventLogClient,
  logger,
}: SoftDeleteGapsByQueryParams): Promise<void> => {
  for (const ruleIdChunk of chunk(ruleIds, MAX_RULE_IDS_PER_QUERY)) {
    try {
      await softDeleteChunk({ ruleIdChunk, eventLogClient, logger });
    } catch (err) {
      // A client-side timeout aborts the request, but Elasticsearch runs the
      // update to completion server-side, so this is not a failure to act on.
      if (err instanceof EsErrors.TimeoutError) {
        logger.warn(
          `softDeleteGapsByQuery: client timed out waiting on gap soft-deletion for ${ruleIdChunk.length} rules. Elasticsearch may still be completing it.`
        );
        continue;
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        `softDeleteGapsByQuery: Failed to soft delete gaps for ${ruleIdChunk.length} rules: ${message}`
      );
    }
  }
};
