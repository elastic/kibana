/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../../services/query_service/query_service';

/**
 * The state the preconditioned alert actions compare their request against,
 * reduced from an alert's `.alert-actions` history. Field names match the
 * request bodies (`assignee_uid`, `tags`) so a handler compares like with
 * like.
 */
export interface AlertActionState {
  acknowledged: boolean;
  assignee_uid: string | null;
  tags: string[];
}

/** State of an alert with no recorded ack, assign or tag action. */
export const EMPTY_ALERT_ACTION_STATE: AlertActionState = {
  acknowledged: false,
  assignee_uid: null,
  tags: [],
};

/**
 * One row of the state projection. Every aggregate is optional because
 * `drop_null_columns` removes columns that are null for every row.
 */
interface RawAlertActionStateRow {
  episode_id: string;
  last_ack_action?: string | null;
  last_assign_at?: string | null;
  last_assignee_at?: string | null;
  last_assignee_uid?: string | null;
  last_tag_at?: string | null;
  last_tagged_at?: string | null;
  last_tags?: string | string[] | null;
}

/**
 * Elasticsearch does not index `null` or `[]`, so `LAST(assignee_uid …)` and
 * `LAST(tags …)` skip the action that cleared the value and keep returning
 * the superseded one. An action newer than the last action that carried a
 * value is therefore a clear.
 */
const isCleared = (lastActionAt?: string | null, lastValueAt?: string | null): boolean =>
  lastActionAt != null && lastActionAt !== lastValueAt;

const toAlertActionState = (row: RawAlertActionStateRow): AlertActionState => ({
  acknowledged: row.last_ack_action === ALERT_EPISODE_ACTION_TYPE.ACK,
  assignee_uid: isCleared(row.last_assign_at, row.last_assignee_at)
    ? null
    : row.last_assignee_uid ?? null,
  tags: isCleared(row.last_tag_at, row.last_tagged_at) ? [] : normalizeTags(row.last_tags),
});

interface LoadAlertActionStatesParams {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeIds: readonly string[];
}

/**
 * Reduces the ack / assign / tag history of every requested alert to its
 * current state in a single ES|QL round-trip, keyed by `episode_id` so both
 * the single and the bulk path can look an alert up directly. Alerts with no
 * such history are absent from the map; callers fall back to
 * {@link EMPTY_ALERT_ACTION_STATE}.
 *
 * Series-scoped actions are excluded by the `episode_id` filter, which is
 * what makes the result safe to compare an episode-scoped request against.
 */
export const loadAlertActionStatesByEpisodeId = async ({
  queryService,
  spaceId,
  episodeIds,
}: LoadAlertActionStatesParams): Promise<Map<string, AlertActionState>> => {
  if (episodeIds.length === 0) {
    return new Map();
  }

  const episodeIdValues = [...new Set(episodeIds)].map((episodeId) => esql.str(episodeId));

  const query = esql`
    FROM ${ALERT_ACTIONS_DATA_STREAM}
    | WHERE space_id == ${spaceId}
        AND episode_id IN (${episodeIdValues})
        AND action_type IN ("ack", "unack", "assign", "tag")
    | STATS
        last_ack_action = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_assign_at = MAX(@timestamp) WHERE action_type == "assign",
        last_assignee_at = MAX(@timestamp) WHERE action_type == "assign" AND assignee_uid IS NOT NULL,
        last_assignee_uid = LAST(assignee_uid, @timestamp) WHERE action_type == "assign",
        last_tag_at = MAX(@timestamp) WHERE action_type == "tag",
        last_tagged_at = MAX(@timestamp) WHERE action_type == "tag" AND tags IS NOT NULL,
        last_tags = LAST(tags, @timestamp) WHERE action_type == "tag"
      BY episode_id
    | KEEP episode_id, last_ack_action, last_assign_at, last_assignee_at, last_assignee_uid, last_tag_at, last_tagged_at, last_tags
  `.toRequest();

  const rows = queryResponseToRecords<RawAlertActionStateRow>(
    await queryService.executeQuery({ query: query.query })
  );

  return new Map(rows.map((row) => [row.episode_id, toAlertActionState(row)]));
};
