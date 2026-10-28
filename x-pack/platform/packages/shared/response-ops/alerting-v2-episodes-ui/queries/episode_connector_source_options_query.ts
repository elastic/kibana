/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
  NATIVE_EPISODE_SOURCE,
} from '@kbn/alerting-v2-common-queries';

export interface EpisodeConnectorSourceOptionRow {
  source: string;
}

/** Cap on connector names offered in the source filter. */
export const CONNECTOR_SOURCE_OPTIONS_LIMIT = 500;

/**
 * Distinct connector `source` values on alert events. Empty, native, and the
 * reserved Classic/Universal ids are excluded. The caller applies the time range.
 */
export const buildEpisodeConnectorSourceOptionsQuery = (spaceId: string) => {
  // prettier-ignore
  return esql
    .from(ALERT_EVENTS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`source IS NOT NULL`
    .where`source != ""`
    .where`source != ${NATIVE_EPISODE_SOURCE}`
    .where`source != ${EPISODE_SOURCE_FILTER_CLASSIC}`
    .where`source != ${EPISODE_SOURCE_FILTER_UNIVERSAL}`
    .pipe`STATS BY source`
    .sort(['source', 'ASC'])
    .pipe`LIMIT ${CONNECTOR_SOURCE_OPTIONS_LIMIT}`;
};
