/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TRACKED,
} from '@kbn/rule-data-utils';
import { uniq } from 'lodash';
import type { RuleAlertData } from '../../types';
import type { SearchResult } from '../types';
import { isValidAlertIndexName } from '../../alerts_service';
import type { TrackedAlertsSearch } from './get_tracked_alerts';
import { buildUntrackedAlert } from './build_untracked_alert';

// Bounds the documents loaded and written by one run. A rule with more orphans is cleaned up
// over several runs.
export const MAX_ORPHANED_ALERTS_PER_RUN = 1000;

type SearchHit<AlertData extends RuleAlertData> = SearchResult<AlertData>['hits'][number];

export type UntrackOrphanedAlertsBulkOperation<AlertData extends RuleAlertData> =
  | BulkOperationContainer
  | (Alert & AlertData);

export interface UntrackOrphanedAlertsParams<AlertData extends RuleAlertData> {
  ruleId: string;
  // Every alert document the task state knows or the run has loaded. The run handles these.
  knownAlertUuids: string[];
  timestamp: string;
  search: TrackedAlertsSearch<AlertData>;
  bulk: (operations: Array<UntrackOrphanedAlertsBulkOperation<AlertData>>) => Promise<BulkResponse>;
  logger: Logger;
  ruleInfoMessage: string;
  logTags: { tags: string[] };
}

export interface UntrackOrphanedAlertsResult {
  untrackedCount: number;
  // False when orphans may remain, so the caller knows to try again on a later run.
  isComplete: boolean;
}

/**
 * Untracks the rule's active alert documents that no run will ever load again: the ones that are
 * not tracked and that the task state does not know. Never throws, so it cannot fail the run.
 */
export const untrackOrphanedAlerts = async <AlertData extends RuleAlertData>({
  ruleId,
  knownAlertUuids,
  timestamp,
  search,
  bulk,
  logger,
  ruleInfoMessage,
  logTags,
}: UntrackOrphanedAlertsParams<AlertData>): Promise<UntrackOrphanedAlertsResult> => {
  try {
    // No retries here: a failed attempt is repeated by the next run, and retrying would delay
    // this run when Elasticsearch is already struggling.
    const { hits, _shards: shards } = await search(getOrphanedAlertsQuery(ruleId, knownAlertUuids));

    // The query already leaves out the documents the run knows. They are checked again because
    // untracking one of them would close an alert the rule still tracks.
    const knownAlertUuidSet = new Set(knownAlertUuids);
    const operations = hits.flatMap((hit) =>
      hit._id && knownAlertUuidSet.has(hit._id)
        ? []
        : getUntrackOperations({ hit, timestamp, logger, ruleInfoMessage, logTags })
    );
    const failedErrorTypes: string[] = [];
    if (operations.length > 0) {
      const { items } = await bulk(operations);
      for (const { index } of items) {
        if (index?.error) {
          failedErrorTypes.push(index.error.type);
        }
      }
    }

    const untrackedCount = operations.length / 2 - failedErrorTypes.length;
    if (untrackedCount > 0) {
      logger.warn(
        `Untracked ${untrackedCount} orphaned active alert document(s) ${ruleInfoMessage}`,
        logTags
      );
    }
    if (failedErrorTypes.length > 0) {
      logger.warn(
        `Failed to untrack ${
          failedErrorTypes.length
        } orphaned active alert document(s) ${ruleInfoMessage}: ${uniq(failedErrorTypes).join(
          ', '
        )}`,
        logTags
      );
    }

    return {
      untrackedCount,
      isComplete:
        hits.length < MAX_ORPHANED_ALERTS_PER_RUN &&
        failedErrorTypes.length === 0 &&
        shards.failed === 0,
    };
  } catch (err) {
    logger.warn(
      `Error untracking orphaned active alert documents ${ruleInfoMessage} - ${err.message}`,
      logTags
    );
    return { untrackedCount: 0, isComplete: false };
  }
};

// Matches documents written before `kibana.alert.tracked` existed and documents that an earlier
// version left active with tracked set to false.
const getOrphanedAlertsQuery = (ruleId: string, knownAlertUuids: string[]) => ({
  size: MAX_ORPHANED_ALERTS_PER_RUN,
  seq_no_primary_term: true,
  query: {
    bool: {
      filter: [
        { term: { [ALERT_RULE_UUID]: ruleId } },
        { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
      ],
      must_not: [
        { term: { [ALERT_TRACKED]: true } },
        ...(knownAlertUuids.length > 0 ? [{ ids: { values: knownAlertUuids } }] : []),
      ],
    },
  },
});

const getUntrackOperations = <AlertData extends RuleAlertData>({
  hit: { _id: id, _index: index, _seq_no: seqNo, _primary_term: primaryTerm, _source: alert },
  timestamp,
  logger,
  ruleInfoMessage,
  logTags,
}: {
  hit: SearchHit<AlertData>;
  timestamp: string;
  logger: Logger;
  ruleInfoMessage: string;
  logTags: { tags: string[] };
}): Array<UntrackOrphanedAlertsBulkOperation<AlertData>> => {
  if (!id || !alert) {
    return [];
  }
  if (!isValidAlertIndexName(index)) {
    logger.warn(
      `Could not untrack orphaned alert ${id} in ${index}. Partial and restored alert indices are not supported ${ruleInfoMessage}.`,
      logTags
    );
    return [];
  }

  return [
    {
      index: {
        _id: id,
        _index: index,
        if_seq_no: seqNo,
        if_primary_term: primaryTerm,
        require_alias: false,
      },
    },
    buildUntrackedAlert<AlertData>({ alert, timestamp }),
  ];
};
