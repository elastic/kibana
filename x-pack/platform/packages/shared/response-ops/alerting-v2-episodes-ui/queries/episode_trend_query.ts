/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import {
  buildEpisodeTrendQuery as buildEpisodeTrendQueryCommon,
  parseEpisodeTrendRows as parseEpisodeTrendRowsCommon,
} from '@kbn/alerting-v2-common-queries';

export interface EpisodeTrendRow {
  '@timestamp': string;
  'episode.status': AlertEpisodeStatus;
  /**
   * Evaluated numeric value per requested metric label, or `null` when the event
   * recorded no value for it (e.g. a status-only lifecycle event).
   */
  metrics: Record<string, number | null>;
}

/**
 * ES|QL query returning every `.rule-events` event for an episode (oldest first),
 * carrying the lifecycle status and, for each requested metric label, the value the
 * rule evaluated for that execution.
 */
export const buildEpisodeTrendQuery = (
  spaceId: string,
  episodeId: string,
  metricLabels: string[]
) => buildEpisodeTrendQueryCommon(spaceId, episodeId, metricLabels);

/**
 * Maps the raw ES|QL rows back into {@link EpisodeTrendRow}s, keying each event's values
 * by the metric label that produced them and coercing the extracted values to numbers.
 */
export const parseEpisodeTrendRows = (
  rawRows: Array<Record<string, unknown>>,
  metricLabels: string[]
): EpisodeTrendRow[] =>
  parseEpisodeTrendRowsCommon(rawRows, metricLabels) as EpisodeTrendRow[];
