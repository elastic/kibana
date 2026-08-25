/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import {
  buildEpisodeGroupHashQuery,
  buildEpisodeQuery,
  type AlertEpisodeEsqlRow,
  type EpisodeGroupHashEsqlRow,
} from '@kbn/alerting-v2-common-queries';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';

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
    // Resolving the group hash first lets the main query narrow to the
    // episode's series instead of aggregating the whole space
    const [lookupRow] = await this.queryService.executeQueryRows<EpisodeGroupHashEsqlRow>({
      query: buildEpisodeGroupHashQuery(this.spaceId, episodeId).print('basic'),
    });
    if (lookupRow?.group_hash == null) {
      return undefined;
    }

    const rows = await this.queryService.executeQueryRows<AlertEpisodeEsqlRow>({
      query: buildEpisodeQuery(this.spaceId, episodeId, lookupRow.group_hash).print('basic'),
    });

    const [row] = rows;
    if (!row) {
      return undefined;
    }

    return { ...row, last_tags: normalizeTags(row.last_tags) };
  }
}
