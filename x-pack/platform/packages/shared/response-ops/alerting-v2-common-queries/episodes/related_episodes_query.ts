/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM, TIME_FIELD, RELATED_EPISODES_LIMIT } from './constants';
import { addEpisodeAggregation } from './episodes_query';

export const RELATED_EPISODE_FIELDS = [
  '@timestamp',
  'episode.id',
  'episode.status',
  'rule.id',
  'group_hash',
  'first_timestamp',
  'last_timestamp',
  'duration',
  'episode_data',
  'severity',
] as const;

export const buildRelatedBaseQuery = (
  spaceId: string,
  ruleId: string,
  excludeEpisodeId: string
): ComposerQuery => {
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source']).where`space_id == ${spaceId}`
    .where`type == "alert"`.where`rule.id == ${ruleId} AND episode.id != ${excludeEpisodeId}`;
};

export const finishRelatedEpisodesQuery = (
  query: ComposerQuery,
  limit: number = RELATED_EPISODES_LIMIT
): ComposerQuery => {
  addEpisodeAggregation(query);

  return query
    .sort([TIME_FIELD, 'DESC'])
    .limit(limit)
    .keep(...RELATED_EPISODE_FIELDS);
};

export const buildRelatedSameRuleQuery = (
  spaceId: string,
  ruleId: string,
  excludeEpisodeId: string,
  limit?: number
): ComposerQuery => {
  return finishRelatedEpisodesQuery(
    buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId),
    limit
  );
};

export const buildRelatedOtherGroupsQuery = (
  spaceId: string,
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string,
  limit?: number
): ComposerQuery => {
  const query = buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId);
  query.where`group_hash != ${groupHash}`;
  return finishRelatedEpisodesQuery(query, limit);
};

export const buildRelatedSameGroupQuery = (
  spaceId: string,
  ruleId: string,
  groupHash: string,
  excludeEpisodeId: string,
  limit?: number
): ComposerQuery => {
  const query = buildRelatedBaseQuery(spaceId, ruleId, excludeEpisodeId);
  query.where`group_hash == ${groupHash}`;
  return finishRelatedEpisodesQuery(query, limit);
};
