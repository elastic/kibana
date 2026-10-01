/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { episodeSubject, type SubjectInput } from './subject';

/**
 * Builds the episode-scoped composite suppression key:
 * `${subject}:${group_hash}:${episode_id}`
 *
 * For internal episodes `subject = rule_id`; for external episodes
 * `subject = ${space_id}::${source}` (e.g. "default::pagerduty").
 */
export const suppressionEpisodeKey = (
  x: SubjectInput & { group_hash: string; episode_id: string }
): string => `${episodeSubject(x)}:${x.group_hash}:${x.episode_id}`;

/**
 * Builds the series-scoped composite suppression key:
 * `${subject}:${group_hash}:*`
 *
 * Used to match series-level suppressions (null `episode_id`) against any
 * episode that belongs to the same series.
 */
export const suppressionSeriesKey = (x: SubjectInput & { group_hash: string }): string =>
  `${episodeSubject(x)}:${x.group_hash}:*`;
