/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ACTIONS_SERIES_ID_EVAL } from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { DecodedSeriesId } from '@kbn/alerting-v2-utils';
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
  series_id: string;
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
  series: readonly DecodedSeriesId[];
}

/**
 * Filters `.alert-actions` to one decoded series: rule-backed series by the
 * rule that owns them, external ones by their source, both by `group_hash`.
 * The hash is repeated per branch because it is only unique within an owner.
 */
const buildSeriesCondition = (series: DecodedSeriesId) =>
  series.kind === 'rule'
    ? esql.exp`rule_id == ${series.rule_id} AND group_hash == ${series.group_hash}`
    : esql.exp`source == ${series.source} AND group_hash == ${series.group_hash}`;

/**
 * Reduces the snooze / unsnooze history of every requested series to its
 * current state in a single ES|QL round-trip, keyed by the series' canonical
 * id (`encodeSeriesId`). A series is identified by its owner and `group_hash`,
 * so a snooze recorded for another rule that shares the hash is not read.
 * The space is the request's `spaceId`, which every series passed in must
 * already belong to. Series with no such history are absent from the map;
 * callers fall back to {@link EMPTY_SERIES_ACTION_STATE}.
 *
 * Series actions are persisted with a null `alert_id`, which is what the
 * `alert_id IS NULL` filter selects.
 */
export const loadSeriesActionStatesBySeries = async ({
  queryService,
  spaceId,
  series,
}: LoadSeriesActionStatesParams): Promise<Map<string, SeriesActionState>> => {
  if (series.length === 0) {
    return new Map();
  }

  const conditions = series.map(buildSeriesCondition);
  const seriesCondition = conditions.reduce(
    (accumulated, condition) => esql.exp`${accumulated} OR ${condition}`
  );

  const query = esql.from([ALERT_ACTIONS_DATA_STREAM])
    .where`space_id == ${spaceId} AND alert_id IS NULL AND action_type IN ("snooze", "unsnooze")`
    .where`${seriesCondition}`.pipe(ACTIONS_SERIES_ID_EVAL).pipe`STATS
        last_snooze_action = LAST(action_type, @timestamp),
        snoozed_until = LAST(expiry, @timestamp) WHERE action_type == "snooze"
      BY series_id`
    .keep('series_id', 'last_snooze_action', 'snoozed_until')
    .toRequest();

  const rows = queryResponseToRecords<RawSeriesActionStateRow>(
    await queryService.executeQuery({ query: query.query })
  );

  const now = Date.now();
  return new Map(rows.map((row) => [row.series_id, toSeriesActionState(row, now)]));
};
