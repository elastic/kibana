/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeEventDataQuery as buildEpisodeEventDataQueryCommon } from '@kbn/alerting-v2-common-queries';

export interface EpisodeEventDataRow {
  'episode.id': string;
  last_data: string | null;
  last_data_timestamp: string | null;
  last_event_timestamp: string | null;
}

/**
 * ES|QL query that extracts the alert `data` object from the latest non-empty
 * `.rule-events` document for the given episode, alongside the timestamp of
 * that data event and the timestamp of the most recent event overall.
 */
export const buildEpisodeEventDataQuery = (spaceId: string, episodeId: string) =>
  buildEpisodeEventDataQueryCommon(spaceId, episodeId);
