/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ComposerQuery } from '@elastic/esql';
import {
  ALERT_EVENTS_DATA_STREAM,
  DEFAULT_TIME_FIELD as TIME_FIELD,
} from '@kbn/alerting-v2-constants';
import { addEpisodeSummaryStats } from '@kbn/alerting-v2-common-queries';
// Subset of `ALERT_EPISODE_FIELDS` actually populated by this query. The action
// `last_*` columns come from the action queries, and `episode_data` from
// `buildEpisodesDataRequest` for the few rows returned.
export const RELATED_EPISODE_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'duration',
  'severity',
] as const;

const RELATED_EPISODE_LIMIT = 5;

export const finishRelatedEpisodesQuery = (query: ComposerQuery) => {
  addEpisodeSummaryStats(query);

  return query
    .sort([TIME_FIELD, 'DESC'])
    .limit(RELATED_EPISODE_LIMIT)
    .keep(...RELATED_EPISODE_FIELDS);
};

/**
 * What "related" is relative to: episodes of the same rule, or, for external alerts that have no
 * rule, episodes ingested from the same source.
 */
export type RelatedEpisodesScope =
  | { type: 'rule'; ruleId: string }
  | { type: 'source'; source: string };

export const getRelatedEpisodesScope = ({
  ruleId,
  source,
}: {
  ruleId: string | null | undefined;
  source: string | undefined;
}): RelatedEpisodesScope | undefined => {
  if (ruleId) {
    return { type: 'rule', ruleId };
  }
  return source ? { type: 'source', source } : undefined;
};

export const getRelatedEpisodesScopeKey = (scope: RelatedEpisodesScope | undefined): string => {
  if (!scope) {
    return '';
  }
  return scope.type === 'rule' ? `rule:${scope.ruleId}` : `source:${scope.source}`;
};

export const buildRelatedBaseQuery = (
  spaceId: string,
  scope: RelatedEpisodesScope,
  excludeEpisodeId: string
) => {
  // No `_source`: the related rows are aggregated from indexed fields only.
  const query = esql.from(ALERT_EVENTS_DATA_STREAM).where`space_id == ${spaceId}`
    .where`type == "alert"`;

  return scope.type === 'rule'
    ? query.where`rule.id == ${scope.ruleId} AND episode.id != ${excludeEpisodeId}`
    : query.where`source == ${scope.source} AND episode.id != ${excludeEpisodeId}`;
};
