/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { inject, injectable } from 'inversify';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  buildEpisodeQuery,
  buildEpisodeEventsQuery,
  buildEpisodeEventDataQuery,
  buildEpisodeActionsQuery,
  buildEpisodeActionsHistoryQuery,
  buildEpisodeFlappingQuery,
  buildEpisodeTrendQuery,
  buildEpisodeTagOptionsQuery,
  buildGroupActionsQuery,
  buildTagSuggestionsQuery,
  buildRelatedSameRuleQuery,
  buildRelatedOtherGroupsQuery,
  buildRelatedSameGroupQuery,
  ALERT_EVENTS_DATA_STREAM,
  ALERT_ACTIONS_DATA_STREAM,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEventType } from '../../resources/datastreams/alert_events';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import type {
  EpisodesClientContract,
  EpisodeData,
  FindEpisodesParams,
  FindEpisodesResult,
  EpisodeKpis,
  GetKpisParams,
  EpisodeEventRow,
  EpisodeEventDataRow,
  EpisodeActionState,
  EpisodeActionHistoryEntry,
  GetActionsHistoryParams,
  GroupActionState,
  GetRelatedEpisodesParams,
  RelatedEpisode,
  EpisodeTrendRow,
  GetTrendParams,
  EpisodeFlappingStatus,
} from './types';

const EPISODE_LOOKBACK_DAYS = 30;

const defaultTimeRange = (): { gte: string } => ({
  gte: new Date(Date.now() - EPISODE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString(),
});

const buildTimestampFilter = (timeRange: { gte: string; lte?: string }) => ({
  range: {
    '@timestamp': {
      gte: timeRange.gte,
      ...(timeRange.lte ? { lte: timeRange.lte } : {}),
    },
  },
});

interface RawEpisodeRow {
  'episode.id': string;
  'episode.status': string;
  'rule.id': string;
  group_hash: string;
  first_timestamp: string;
  last_timestamp: string;
  duration: number;
  triggered_at?: string;
  severity?: string | null;
  episode_data?: string | null;
  last_ack_action?: string;
  last_assignee_uid?: string | null;
  last_snooze_action?: string;
  snooze_expiry?: string;
  space_id: string;
}

const toEpisodeData = (row: RawEpisodeRow): EpisodeData => ({
  episode_id: row['episode.id'],
  episode_status: row['episode.status'] as EpisodeData['episode_status'],
  rule_id: row['rule.id'],
  group_hash: row.group_hash,
  first_timestamp: row.first_timestamp,
  last_timestamp: row.last_timestamp,
  duration: row.duration,
  triggered_at: row.triggered_at,
  severity: row.severity,
  episode_data: row.episode_data,
  last_ack_action: row.last_ack_action as EpisodeData['last_ack_action'],
  last_assignee_uid: row.last_assignee_uid,
  last_snooze_action: row.last_snooze_action as EpisodeData['last_snooze_action'],
  snooze_expiry: row.snooze_expiry,
  space_id: row.space_id,
});

@injectable()
export class EpisodesClient implements EpisodesClientContract {
  constructor(
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  public async find(params: FindEpisodesParams): Promise<FindEpisodesResult> {
    const {
      filters = {},
      timeRange,
      page = 1,
      perPage = 10,
      sortBy = 'last_timestamp',
      sortOrder = 'desc',
    } = params;

    const alertEventType: AlertEventType = 'alert';

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.status?.length) {
      const placeholders = filters.status.map(() => '?').join(', ');
      whereClauses.push(`episode.status IN (${placeholders})`);
      queryParams.push(...filters.status);
    }
    if (filters.rule_ids?.length) {
      const placeholders = filters.rule_ids.map(() => '?').join(', ');
      whereClauses.push(`rule.id IN (${placeholders})`);
      queryParams.push(...filters.rule_ids);
    }
    if (filters.severity?.length) {
      const placeholders = filters.severity.map(() => '?').join(', ');
      whereClauses.push(`severity IN (${placeholders})`);
      queryParams.push(...filters.severity);
    }
    if (filters.group_hashes?.length) {
      const placeholders = filters.group_hashes.map(() => '?').join(', ');
      whereClauses.push(`group_hash IN (${placeholders})`);
      queryParams.push(...filters.group_hashes);
    }

    const postAggWhere = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    const queryString = `FROM ${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM} METADATA _source
    | WHERE (type == "alert" OR action_type IN ("snooze", "unsnooze", "ack", "unack", "assign")) AND space_id == ?
    | INLINE STATS
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
        snooze_expiry      = LAST(expiry, @timestamp)      WHERE action_type == "snooze"
      BY group_hash
    | EVAL episode_id = COALESCE(episode.id, episode_id)
    | INLINE STATS
        last_ack_action    = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_assignee_uid  = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
      BY episode_id
    | WHERE type == ?
    | EVAL extracted_data = JSON_EXTRACT(_source, "data")
    | DROP _source
    | INLINE STATS
        first_timestamp = MIN(@timestamp),
        last_timestamp  = MAX(@timestamp),
        triggered_at    = MIN(@timestamp) WHERE episode.status == "active",
        episode_data    = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}",
        severity        = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL
      BY episode.id
    | EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
    | WHERE @timestamp == last_timestamp ${postAggWhere}
    | KEEP episode.id, episode.status, rule.id, group_hash, first_timestamp, last_timestamp,
           duration, triggered_at, severity, episode_data, last_ack_action, last_assignee_uid,
           last_snooze_action, snooze_expiry, space_id
    | SORT ${sortBy} ${sortOrder.toUpperCase()}
    | LIMIT ${(page - 1) * perPage + perPage}`;

    const response = await this.queryService.executeQuery({
      query: queryString,
      params: [this.spaceId, alertEventType, ...queryParams],
      filter: buildTimestampFilter(timeRange),
    });

    const allRows = this.toRows<RawEpisodeRow>(response);
    const offset = (page - 1) * perPage;
    const pageRows = allRows.slice(offset, offset + perPage);

    return {
      episodes: pageRows.map(toEpisodeData),
      total: allRows.length >= (page - 1) * perPage + perPage ? -1 : allRows.length,
    };
  }

  public async get(episodeId: string): Promise<EpisodeData | undefined> {
    const query = buildEpisodeQuery(this.spaceId, episodeId);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(defaultTimeRange()),
    });

    const rows = this.toRows<RawEpisodeRow>(response);
    return rows.length > 0 ? toEpisodeData(rows[0]) : undefined;
  }

  public async getKpis(params: GetKpisParams): Promise<EpisodeKpis> {
    const { currentUserUid, filters = {}, timeRange } = params;
    const alertEventType: AlertEventType = 'alert';

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (filters.status?.length) {
      const placeholders = filters.status.map(() => '?').join(', ');
      whereClauses.push(`episode.status IN (${placeholders})`);
      queryParams.push(...filters.status);
    }
    if (filters.rule_ids?.length) {
      const placeholders = filters.rule_ids.map(() => '?').join(', ');
      whereClauses.push(`rule.id IN (${placeholders})`);
      queryParams.push(...filters.rule_ids);
    }

    const postAggWhere = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : '';

    const assignedToMeEval = currentUserUid
      ? `EVAL _assigned_to_me = CASE(last_assignee_uid == ?, 1, 0)`
      : `EVAL _assigned_to_me = 0`;
    const assignedParams = currentUserUid ? [currentUserUid] : [];

    const queryString = `FROM ${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM} METADATA _source
    | WHERE (type == "alert" OR action_type IN ("snooze", "unsnooze", "ack", "unack", "assign")) AND space_id == ?
    | INLINE STATS
        last_snooze_action = LAST(action_type, @timestamp) WHERE action_type IN ("snooze", "unsnooze"),
        snooze_expiry      = LAST(expiry, @timestamp)      WHERE action_type == "snooze"
      BY group_hash
    | EVAL episode_id = COALESCE(episode.id, episode_id)
    | INLINE STATS
        last_ack_action    = LAST(action_type, @timestamp) WHERE action_type IN ("ack", "unack"),
        last_assignee_uid  = LAST(assignee_uid, @timestamp) WHERE action_type == "assign"
      BY episode_id
    | WHERE type == ?
    | EVAL extracted_data = JSON_EXTRACT(_source, "data")
    | DROP _source
    | INLINE STATS
        first_timestamp = MIN(@timestamp),
        last_timestamp  = MAX(@timestamp),
        triggered_at    = MIN(@timestamp) WHERE episode.status == "active",
        episode_data    = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}",
        severity        = LAST(severity, @timestamp) WHERE status == "breached" AND severity IS NOT NULL
      BY episode.id
    | EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
    | WHERE @timestamp == last_timestamp ${postAggWhere}
    | EVAL _active_rule_id = CASE(episode.status == "active", rule.id, null)
    | ${assignedToMeEval}
    | EVAL _is_unassigned  = CASE(last_assignee_uid IS NULL, 1, 0)
    | EVAL _is_acked       = CASE(last_ack_action == "ack", 1, 0)
    | EVAL _is_snoozed     = CASE(last_snooze_action == "snooze" AND (snooze_expiry IS NULL OR TO_DATETIME(snooze_expiry) > NOW()), 1, 0)
    | STATS
      alerts_count   = COUNT(*),
      firing_rules   = COUNT_DISTINCT(_active_rule_id),
      assigned_to_me = SUM(_assigned_to_me),
      unassigned     = SUM(_is_unassigned),
      acknowledged   = SUM(_is_acked),
      snoozed        = SUM(_is_snoozed)`;

    const response = await this.queryService.executeQuery({
      query: queryString,
      params: [this.spaceId, alertEventType, ...queryParams, ...assignedParams],
      filter: buildTimestampFilter(timeRange),
    });

    const rows = this.toRows<EpisodeKpis>(response);
    return rows[0] ?? { alerts_count: 0, firing_rules: 0, assigned_to_me: 0, unassigned: 0, acknowledged: 0, snoozed: 0 };
  }

  public async getEvents(
    episodeId: string,
    timeRange: { gte: string; lte?: string }
  ): Promise<EpisodeEventRow[]> {
    const query = buildEpisodeEventsQuery(this.spaceId, episodeId);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(timeRange),
    });

    return this.toRows<EpisodeEventRow>(response);
  }

  public async getEventData(
    episodeId: string,
    timeRange: { gte: string; lte?: string }
  ): Promise<EpisodeEventDataRow | undefined> {
    const query = buildEpisodeEventDataQuery(this.spaceId, episodeId);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(timeRange),
    });

    const rows = this.toRows<EpisodeEventDataRow>(response);
    return rows[0];
  }

  public async getActions(episodeIds: string[]): Promise<EpisodeActionState[]> {
    if (episodeIds.length === 0) return [];

    const query = buildEpisodeActionsQuery(this.spaceId, episodeIds);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
    });

    return this.toRows<EpisodeActionState>(response);
  }

  public async getActionsHistory(params: GetActionsHistoryParams): Promise<EpisodeActionHistoryEntry[]> {
    const { episodeId, groupHash, before, limit } = params;

    const query = buildEpisodeActionsHistoryQuery(this.spaceId, episodeId, groupHash, {
      before,
      limit,
    });
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
    });

    return this.toRows<EpisodeActionHistoryEntry>(response);
  }

  public async getGroupActions(groupHashes: string[]): Promise<GroupActionState[]> {
    if (groupHashes.length === 0) return [];

    const query = buildGroupActionsQuery(this.spaceId, groupHashes);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
    });

    return this.toRows<GroupActionState>(response);
  }

  public async getRelatedEpisodes(params: GetRelatedEpisodesParams): Promise<RelatedEpisode[]> {
    const { ruleId, excludeEpisodeId, groupHash, excludeGroupHash, limit, timeRange } = params;

    let query;
    if (groupHash && excludeGroupHash) {
      query = buildRelatedOtherGroupsQuery(this.spaceId, ruleId, groupHash, excludeEpisodeId, limit);
    } else if (groupHash && !excludeGroupHash) {
      query = buildRelatedSameGroupQuery(this.spaceId, ruleId, groupHash, excludeEpisodeId, limit);
    } else {
      query = buildRelatedSameRuleQuery(this.spaceId, ruleId, excludeEpisodeId, limit);
    }

    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(timeRange),
    });

    return this.toRows<RelatedEpisode>(response);
  }

  public async getTrend(params: GetTrendParams): Promise<EpisodeTrendRow[]> {
    const { episodeId, metricLabels, timeRange } = params;

    const query = buildEpisodeTrendQuery(this.spaceId, episodeId, metricLabels);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(timeRange),
    });

    const rawRows = this.toRows<Record<string, unknown>>(response);
    return rawRows.map((row) => ({
      '@timestamp': row['@timestamp'] as string,
      'episode.status': row['episode.status'] as AlertEpisodeStatus,
      metrics: Object.fromEntries(
        metricLabels.map((label) => {
          const val = row[label];
          const num = typeof val === 'number' ? val : typeof val === 'string' ? Number(val) : NaN;
          return [label, Number.isFinite(num) ? num : null];
        })
      ),
    }));
  }

  public async getFlappingStatuses(
    episodeId: string,
    limit: number = 10
  ): Promise<EpisodeFlappingStatus[]> {
    const query = buildEpisodeFlappingQuery(this.spaceId, episodeId, limit);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
    });

    return this.toRows<EpisodeFlappingStatus>(response);
  }

  public async getTagOptions(timeRange: { gte: string; lte?: string }): Promise<string[]> {
    const query = buildEpisodeTagOptionsQuery(this.spaceId);
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;

    const response = await this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      filter: buildTimestampFilter(timeRange),
    });

    return this.toRows<{ tags: string }>(response).map((r) => r.tags);
  }

  public async getTagSuggestions(): Promise<string[]> {
    const queryString = buildTagSuggestionsQuery(this.spaceId);

    const response = await this.queryService.executeQuery({
      query: queryString,
    });

    return this.toRows<{ tags: string }>(response).map((r) => r.tags);
  }

  private toRows<T>(response: { columns: Array<{ name: string }>; values: unknown[][] }): T[] {
    const columnNames = response.columns.map((c) => c.name);
    return response.values.map((valueRow) => {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < columnNames.length; i++) {
        const value = valueRow[i];
        row[columnNames[i]] = typeof value === 'bigint' ? Number(value) : value;
      }
      return row as T;
    });
  }
}
