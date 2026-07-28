/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { buildEpisodeEventsQuery as buildEpisodeEventsQueryCommon } from '@kbn/alerting-v2-common-queries';

export interface EpisodeEventRow {
  '@timestamp': string;
  'episode.id': string;
  'episode.status': AlertEpisodeStatus;
  'rule.id': string;
  group_hash: string;
  severity?: string | null;
  data?: string | Record<string, unknown> | null;
}

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export const buildEpisodeEventsEsqlQuery = (spaceId: string, episodeId: string) =>
  buildEpisodeEventsQueryCommon(spaceId, episodeId);
