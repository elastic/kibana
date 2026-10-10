/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../../services/query_service/query_service';

/**
 * The state the preconditioned series actions compare their request against,
 * reduced from a series' `.alert-actions` history. `snoozed_until` is the
 * expiry of the snooze in effect (`null` for an indefinite one) and is only
 * meaningful while `snoozed` is true.
 */
export interface SeriesActionState {
  snoozed: boolean;
  snoozed_until: string | null;
}

/** State of a series with no recorded snooze or unsnooze action. */
export const EMPTY_SERIES_ACTION_STATE: SeriesActionState = {
  snoozed: false,
  snoozed_until: null,
};

/**
 * One row of the state projection. Every aggregate is optional because
 * `drop_null_columns` removes columns that are null for every row.
 */
interface RawSeriesActionStateRow {
  group_hash: string;
  last_snooze_action?: string | null;
  snoozed_until?: string | null;
}

/**
 * A series is snoozed while its latest snooze/unsnooze action is a snooze that
 * has not expired; a snooze without `snoozed_until` never expires. This is the
 * same rule the dispatcher and the episodes UI apply.
 */
const toSeriesActionState = (row: RawSeriesActionStateRow, now: number): SeriesActionState => {
  const snoozedUntil = row.snoozed_until ?? null;
  const snoozed =
    row.last_snooze_action === ALERT_EPISODE_ACTION_TYPE.SNOOZE &&
    (snoozedUntil == null || new Date(snoozedUntil).getTime() > now);

  return { snoozed, snoozed_until: snoozed ? snoozedUntil : null };
};

interface LoadSeriesActionStatesParams {
  queryService: QueryServiceContract;
  spaceId: string;
  groupHashes: readonly string[];
}

/**
 * Reduces the snooze / unsnooze history of every requested series to its
 * current state in a single ES|QL round-trip, keyed by `group_hash`. Series
 * with no such history are absent from the map; callers fall back to
 * {@link EMPTY_SERIES_ACTION_STATE}.
 *
 * Series actions are persisted with a null `alert_id`, which is what the
 * `alert_id IS NULL` filter selects.
 */
export const loadSeriesActionStatesByGroupHash = async ({
  queryService,
  spaceId,
  groupHashes,
}: LoadSeriesActionStatesParams): Promise<Map<string, SeriesActionState>> => {
  if (groupHashes.length === 0) {
    return new Map();
  }

  const groupHashValues = [...new Set(groupHashes)].map((groupHash) => esql.str(groupHash));

  const query = esql`
    FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE space_id == ${spaceId}
        AND group_hash IN (${groupHashValues})
        AND alert_id IS NULL
        AND action_type IN ("snooze", "unsnooze")
    | STATS
        last_snooze_action = LAST(action_type, @timestamp),
        snoozed_until = LAST(expiry, @timestamp) WHERE action_type == "snooze"
      BY group_hash
    | KEEP group_hash, last_snooze_action, snoozed_until
  `.toRequest();

  const rows = queryResponseToRecords<RawSeriesActionStateRow>(
    await queryService.executeQuery({ query: query.query })
  );

  const now = Date.now();
  return new Map(rows.map((row) => [row.group_hash, toSeriesActionState(row, now)]));
};
