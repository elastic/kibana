/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM, DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { asTypedEsqlQuery, type TypedEsqlQuery } from './typed_esql_query';

export interface EpisodeEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  severity?: string | null;
  source?: string | null;
  data?: string | Record<string, unknown> | null;
}

export const ALERT_EPISODE_EVENT_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'severity',
  'source',
  'data',
] as const;

export interface BuildEpisodeEventsQueryOptions {
  /** Inclusive `@timestamp` window. Omitted by the details-page timeline. */
  timeRange?: {
    start: string;
    end: string;
  };
  /** Restrict to a single episode lifecycle status. */
  status?: AlertEpisodeStatus;
  /** Explicit ES|QL LIMIT. Omitted by the details-page timeline. */
  limit?: number;
}

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export const buildEpisodeEventsQuery = (
  spaceId: string,
  episodeId: string,
  { timeRange, status, limit }: BuildEpisodeEventsQueryOptions = {}
): TypedEsqlQuery<EpisodeEventRow> => {
  // prettier-ignore
  let query = esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`;

  if (timeRange) {
    query = query.where`@timestamp >= ${timeRange.start}`;
    query = query.where`@timestamp <= ${timeRange.end}`;
  }

  if (status !== undefined) {
    query = query.where`episode.status == ${status}`;
  }

  // prettier-ignore
  let built = query
    .pipe`EVAL data = JSON_EXTRACT(_source, "$.data")`
    .sort([DEFAULT_TIME_FIELD, 'ASC']);

  if (limit !== undefined) {
    built = built.limit(limit);
  }

  return asTypedEsqlQuery<EpisodeEventRow>(built.keep(...ALERT_EPISODE_EVENT_FIELDS));
};
