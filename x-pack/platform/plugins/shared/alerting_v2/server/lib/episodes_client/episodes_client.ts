/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  buildEpisodeActionsQuery,
  buildEpisodeDataRequest,
  buildEpisodeEventsQuery,
  buildEpisodeQuery,
  buildSeriesSnoozeQuery,
  type BuildEpisodeEventsQueryOptions,
  type EpisodeActionRow,
  type EpisodeDataEsqlRow,
  type EpisodeEventRow,
  type EpisodeEventsEsqlRow,
  type SeriesSnoozeEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';

const toAckAction = (value: string | null | undefined): AlertEpisode['last_ack_action'] =>
  value === 'ack' || value === 'unack' ? value : null;

@injectable()
export class EpisodesClient {
  constructor(
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  /**
   * Returns the aggregated row for a single episode in the request's space, or
   * `undefined` when no such episode exists.
   */
  public async get(episodeId: string): Promise<AlertEpisode | undefined> {
    // The episode row, its latest data and its own actions are separate small
    // lookups by id, so ES never aggregates the whole series of the episode.
    const dataRequest = buildEpisodeDataRequest(this.spaceId, episodeId);
    const [[row], [episodeData], [episodeActions]] = await Promise.all([
      this.queryService.executeQueryRows<EpisodeEventsEsqlRow>({
        query: buildEpisodeQuery(this.spaceId, episodeId).print('basic'),
      }),
      this.queryService.executeQueryRows<EpisodeDataEsqlRow>({
        query: dataRequest.query.print('basic'),
        filter: dataRequest.filter,
      }),
      this.queryService.executeQueryRows<EpisodeActionRow>({
        query: buildEpisodeActionsQuery(this.spaceId, [episodeId]).print('basic'),
      }),
    ]);
    if (!row) {
      return undefined;
    }

    // Snoozes target the series, which is only known from the episode row.
    const [seriesSnooze] = await this.queryService.executeQueryRows<SeriesSnoozeEsqlRow>({
      query: buildSeriesSnoozeQuery(this.spaceId, row.group_hash, row.series_id).print('basic'),
    });

    return {
      ...row,
      episode_data: episodeData?.episode_data ?? null,
      last_ack_action: toAckAction(episodeActions?.last_ack_action),
      last_assignee_uid: episodeActions?.last_assignee_uid ?? null,
      last_tags: normalizeTags(episodeActions?.last_tags),
      last_snooze_action: seriesSnooze?.last_snooze_action ?? null,
      snoozed_until: seriesSnooze?.snoozed_until ?? null,
    };
  }

  /** `.rule-events` rows for one episode, same query as the details timeline. */
  public async getEvents(
    episodeId: string,
    options?: BuildEpisodeEventsQueryOptions
  ): Promise<EpisodeEventRow[]> {
    return this.queryService.executeQueryRows<EpisodeEventRow>({
      query: buildEpisodeEventsQuery(this.spaceId, episodeId, options).print('basic'),
    });
  }
}
