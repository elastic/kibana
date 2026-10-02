/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';

export interface BuildRuleEventsQueryOptions {
  ruleId: string;
  windowEndMs: number;
  /** The exact episodes being drawn (from {@link buildEpisodeSelectionQuery}). */
  episodeIds: string[];
}

/** Fetches every event for the selected episodes, including events before the visible window. */
export const buildRuleEventsQuery = ({
  ruleId,
  windowEndMs,
  episodeIds,
}: BuildRuleEventsQueryOptions) => {
  const toIso = new Date(windowEndMs).toISOString();
  const episodeLiterals = episodeIds.map((id) => esql.str(id));

  return esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`rule.id == ${ruleId}`
    .where`@timestamp <= ${toIso}::DATETIME`.where`episode.id IN (${episodeLiterals})`
    .sort(['@timestamp', 'ASC'])
    .keep('@timestamp', 'episode.id', 'episode.status', 'group_hash');
};
