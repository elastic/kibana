/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus, EpisodeData } from '@kbn/alerting-v2-schemas';

export type EpisodeStatus = AlertEpisodeStatus;

export interface FindEpisodesFilters {
  status?: EpisodeStatus[];
  rule_ids?: string[];
  severity?: string[];
  group_hashes?: string[];
}

export interface FindEpisodesParams {
  filters?: FindEpisodesFilters;
  timeRange: { gte: string; lte?: string };
  page?: number;
  perPage?: number;
  sortBy?: 'last_timestamp' | 'first_timestamp' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

export interface FindEpisodesResult {
  episodes: EpisodeData[];
  total: number;
}

export interface EpisodeKpis {
  alerts_count: number;
  firing_rules: number;
  assigned_to_me: number;
  unassigned: number;
  acknowledged: number;
  snoozed: number;
}

export interface GetKpisParams {
  currentUserUid?: string;
  filters?: FindEpisodesFilters;
  timeRange: { gte: string; lte?: string };
}

export interface EpisodeEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  severity?: string | null;
  data?: string | Record<string, unknown> | null;
}

export interface EpisodeEventDataRow {
  'episode.id': string;
  last_data: string | null;
  last_data_timestamp: string | null;
  last_event_timestamp: string | null;
}

export interface EpisodeActionState {
  episode_id: string;
  rule_id: string | null;
  group_hash: string | null;
  last_ack_action: string | null;
  last_assignee_uid: string | null;
  last_ack_actor: string | null;
}

export interface EpisodeActionHistoryEntry {
  _id: string;
  '@timestamp': string;
  action_type: string;
  actor: string | null;
  episode_id: string | null;
  group_hash: string | null;
  tags: string[] | null;
  assignee_uid: string | null;
  expiry: string | null;
  reason: string | null;
}

export interface GetActionsHistoryParams {
  episodeId: string;
  groupHash: string;
  before?: string;
  limit?: number;
}

export interface GroupActionState {
  group_hash: string;
  rule_id: string | null;
  last_deactivate_action: string | null;
  last_snooze_action: string | null;
  snooze_expiry: string | null;
  tags: string | string[] | null;
  last_snooze_actor: string | null;
  last_deactivate_actor: string | null;
}

export interface GetRelatedEpisodesParams {
  ruleId: string;
  excludeEpisodeId: string;
  groupHash?: string;
  excludeGroupHash?: boolean;
  limit?: number;
  timeRange: { gte: string; lte?: string };
}

export interface RelatedEpisode {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  first_timestamp: string;
  last_timestamp: string;
  duration: number;
  episode_data?: string | null;
  severity?: string | null;
}

export interface EpisodeTrendRow {
  '@timestamp': string;
  'episode.status': AlertEpisodeStatus;
  metrics: Record<string, number | null>;
}

export interface GetTrendParams {
  episodeId: string;
  metricLabels: string[];
  timeRange: { gte: string; lte?: string };
}

export interface EpisodeFlappingStatus {
  'episode.status': AlertEpisodeStatus;
}

export interface EpisodesClientContract {
  find(params: FindEpisodesParams): Promise<FindEpisodesResult>;
  get(episodeId: string): Promise<EpisodeData | undefined>;
  getKpis(params: GetKpisParams): Promise<EpisodeKpis>;
  getEvents(episodeId: string, timeRange: { gte: string; lte?: string }): Promise<EpisodeEventRow[]>;
  getEventData(episodeId: string, timeRange: { gte: string; lte?: string }): Promise<EpisodeEventDataRow | undefined>;
  getActions(episodeIds: string[]): Promise<EpisodeActionState[]>;
  getActionsHistory(params: GetActionsHistoryParams): Promise<EpisodeActionHistoryEntry[]>;
  getGroupActions(groupHashes: string[]): Promise<GroupActionState[]>;
  getRelatedEpisodes(params: GetRelatedEpisodesParams): Promise<RelatedEpisode[]>;
  getTrend(params: GetTrendParams): Promise<EpisodeTrendRow[]>;
  getFlappingStatuses(episodeId: string, limit?: number): Promise<EpisodeFlappingStatus[]>;
  getTagOptions(timeRange: { gte: string; lte?: string }): Promise<string[]>;
  getTagSuggestions(): Promise<string[]>;
}
