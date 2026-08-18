/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';

// Chunk rule IDs to stay well below `index.max_terms_count` (default 65,536)
// when building the `terms` filter.
const MAX_RULE_IDS_PER_QUERY = 10_000;
const GAP_DELETED_FIELD = 'kibana.alert.rule.gap.deleted';

export interface SoftDeleteGapsByQueryParams {
  ruleIds: string[];
  eventLogClient: IEventLogClient;
  logger: Logger;
}

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
      const response = await eventLogClient.softDeleteByQuery({
        field: GAP_DELETED_FIELD,
        query: {
          bool: {
            must: [
              { term: { 'event.action': 'gap' } },
              { term: { 'event.provider': 'alerting' } },
              { terms: { 'rule.id': ruleIdChunk } },
            ],
            must_not: [{ term: { [GAP_DELETED_FIELD]: true } }],
          },
        },
      });

      if (response.failures?.length || response.version_conflicts) {
        logger.warn(
          `softDeleteGapsByQuery: soft-deleted gaps for ${
            ruleIdChunk.length
          } rules with issues (updated=${response.updated ?? 0}, version_conflicts=${
            response.version_conflicts ?? 0
          }, failures=${response.failures?.length ?? 0})`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        `softDeleteGapsByQuery: Failed to soft delete gaps for ${ruleIdChunk.length} rules: ${message}`
      );
    }
  }
};
