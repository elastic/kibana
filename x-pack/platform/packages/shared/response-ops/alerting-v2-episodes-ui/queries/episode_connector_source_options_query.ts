/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { NATIVE_EPISODE_SOURCE } from '@kbn/alerting-v2-common-queries';

export interface EpisodeConnectorSourceOptionRow {
  source: string;
}

/** Cap on connector names offered in the source filter. */
export const CONNECTOR_SOURCE_OPTIONS_LIMIT = 500;

/**
 * Distinct connector `source` values on the latest alert event of each episode.
 * That matches the source filter, which also reads the latest event. Empty and
 * native sources are excluded. One extra row is requested so the caller can tell
 * when the list was cut off. The caller applies the time range.
 */
export const buildEpisodeConnectorSourceOptionsQuery = (spaceId: string) => {
  // prettier-ignore
  return esql
    .from(ALERT_EVENTS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .pipe`INLINE STATS last_timestamp = MAX(@timestamp) BY episode.id`
    .pipe`WHERE @timestamp == last_timestamp`
    .where`source IS NOT NULL`
    .where`source != ""`
    .where`source != ${NATIVE_EPISODE_SOURCE}`
    .pipe`STATS BY source`
    .sort(['source', 'ASC'])
    .pipe`LIMIT ${CONNECTOR_SOURCE_OPTIONS_LIMIT + 1}`;
};
