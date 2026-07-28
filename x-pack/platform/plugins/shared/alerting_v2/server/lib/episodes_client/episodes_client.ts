/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ComposerQuery } from '@elastic/esql';
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
  buildEpisodesQuery,
  buildEpisodesKpisQuery,
  type EpisodesFilterState,
} from '@kbn/alerting-v2-common-queries';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import type {
  EpisodesClientContract,
  EpisodeData,
  FindEpisodesParams,
  FindEpisodesResult,
  FindEpisodesFilters,
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

const toFilterState = (filters: FindEpisodesFilters = {}): EpisodesFilterState => ({
  status: filters.status,
  ruleIds: filters.rule_ids,
  groupHashes: filters.group_hashes,
  severity: filters.severity,
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

    const query = buildEpisodesQuery(
      this.spaceId,
      { sortField: sortBy, sortDirection: sortOrder },
      toFilterState(filters)
    ).limit((page - 1) * perPage + perPage);

    const response = await this.executeComposerQuery(query, buildTimestampFilter(timeRange));
    const allRows = this.toRows<RawEpisodeRow>(response);
    const offset = (page - 1) * perPage;
    const pageRows = allRows.slice(offset, offset + perPage);

    return {
      episodes: pageRows.map(toEpisodeData),
      total: allRows.length >= (page - 1) * perPage + perPage ? -1 : allRows.length,
    };
  }

  public async get(episodeId: string): Promise<EpisodeData | undefined> {
    const response = await this.executeComposerQuery(
      buildEpisodeQuery(this.spaceId, episodeId),
      buildTimestampFilter(defaultTimeRange())
    );

    const rows = this.toRows<RawEpisodeRow>(response);
    return rows.length > 0 ? toEpisodeData(rows[0]) : undefined;
  }

  public async getKpis(params: GetKpisParams): Promise<EpisodeKpis> {
    const { currentUserUid, filters = {}, timeRange } = params;

    const response = await this.executeComposerQuery(
      buildEpisodesKpisQuery(this.spaceId, currentUserUid, toFilterState(filters)),
      buildTimestampFilter(timeRange)
    );

    const rows = this.toRows<EpisodeKpis>(response);
    return (
      rows[0] ?? {
        alerts_count: 0,
        firing_rules: 0,
        assigned_to_me: 0,
        unassigned: 0,
        acknowledged: 0,
        snoozed: 0,
      }
    );
  }

  public async getEvents(
    episodeId: string,
    timeRange: { gte: string; lte?: string }
  ): Promise<EpisodeEventRow[]> {
    const response = await this.executeComposerQuery(
      buildEpisodeEventsQuery(this.spaceId, episodeId),
      buildTimestampFilter(timeRange)
    );
    return this.toRows<EpisodeEventRow>(response);
  }

  public async getEventData(
    episodeId: string,
    timeRange: { gte: string; lte?: string }
  ): Promise<EpisodeEventDataRow | undefined> {
    const response = await this.executeComposerQuery(
      buildEpisodeEventDataQuery(this.spaceId, episodeId),
      buildTimestampFilter(timeRange)
    );
    const rows = this.toRows<EpisodeEventDataRow>(response);
    return rows[0];
  }

  public async getActions(episodeIds: string[]): Promise<EpisodeActionState[]> {
    if (episodeIds.length === 0) return [];

    const response = await this.executeComposerQuery(
      buildEpisodeActionsQuery(this.spaceId, episodeIds)
    );
    return this.toRows<EpisodeActionState>(response);
  }

  public async getActionsHistory(params: GetActionsHistoryParams): Promise<EpisodeActionHistoryEntry[]> {
    const { episodeId, groupHash, before, limit } = params;

    const response = await this.executeComposerQuery(
      buildEpisodeActionsHistoryQuery(this.spaceId, episodeId, groupHash, {
        before,
        limit,
      })
    );
    return this.toRows<EpisodeActionHistoryEntry>(response);
  }

  public async getGroupActions(groupHashes: string[]): Promise<GroupActionState[]> {
    if (groupHashes.length === 0) return [];

    const response = await this.executeComposerQuery(
      buildGroupActionsQuery(this.spaceId, groupHashes)
    );
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

    const response = await this.executeComposerQuery(query, buildTimestampFilter(timeRange));
    return this.toRows<RelatedEpisode>(response);
  }

  public async getTrend(params: GetTrendParams): Promise<EpisodeTrendRow[]> {
    const { episodeId, metricLabels, timeRange } = params;

    const response = await this.executeComposerQuery(
      buildEpisodeTrendQuery(this.spaceId, episodeId, metricLabels),
      buildTimestampFilter(timeRange)
    );

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
    const response = await this.executeComposerQuery(
      buildEpisodeFlappingQuery(this.spaceId, episodeId, limit)
    );
    return this.toRows<EpisodeFlappingStatus>(response);
  }

  public async getTagOptions(timeRange: { gte: string; lte?: string }): Promise<string[]> {
    const response = await this.executeComposerQuery(
      buildEpisodeTagOptionsQuery(this.spaceId),
      buildTimestampFilter(timeRange)
    );
    return this.toRows<{ tags: string }>(response).map((r) => r.tags);
  }

  public async getTagSuggestions(): Promise<string[]> {
    const response = await this.queryService.executeQuery({
      query: buildTagSuggestionsQuery(this.spaceId),
    });

    return this.toRows<{ tags: string }>(response).map((r) => r.tags);
  }

  private async executeComposerQuery(
    query: ComposerQuery,
    filter?: ReturnType<typeof buildTimestampFilter>
  ) {
    const request = query.toRequest();
    const { filter: _composerFilter, ...esqlRequest } = request;
    return this.queryService.executeQuery({
      query: (esqlRequest as unknown as EsqlQueryRequest).query,
      ...(filter ? { filter } : {}),
    });
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
