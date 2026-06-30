/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { ALERT_EPISODE_FIELDS, buildEpisodesBaseQuery } from './episodes_query';

/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query.
 */
export const buildEpisodeQuery = (spaceId: string, episodeId: string): ComposerQuery =>
  buildEpisodesBaseQuery(spaceId).where`episode.id == ${episodeId}`.pipe`LIMIT 1`.keep(
    ...ALERT_EPISODE_FIELDS
  );
