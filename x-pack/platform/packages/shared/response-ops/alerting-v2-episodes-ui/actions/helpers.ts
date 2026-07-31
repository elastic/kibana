/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import * as i18n from './translations';

export const uniqueByGroup = <T extends { group_hash: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.group_hash) ? false : (seen.add(x.group_hash), true)));
};

/** Classic (v1) AAD rows projected into the unified episodes list. */
export const isV1AlertEpisode = (episode: AlertEpisode): boolean => Boolean(episode._is_v1);

/**
 * Episode actions that mutate `.alert-actions` (ack, snooze, tags, …) only apply
 * to v2 episodes. Filter classic rows out of compatibility checks and execute.
 */
export const filterV2Episodes = (episodes: AlertEpisode[]): AlertEpisode[] =>
  episodes.filter((ep) => !isV1AlertEpisode(ep));

/**
 * Builds the toast for a bulk alert-action response. `affected_count` is how
 * many actions the server applied and `errors` holds the per-item failures, so
 * the total attempted is `affected_count + errors.length`; a non-empty `errors`
 * array therefore downgrades the toast from success to a partial-success
 * warning.
 */
export const successOrPartialToast = ({
  affected_count: processed,
  errors,
}: BulkResponse): { title: string; color: 'success' | 'warning' } => {
  const total = processed + errors.length;
  return errors.length === 0
    ? { title: i18n.getBulkSuccessToast(processed), color: 'success' }
    : { title: i18n.getBulkPartialSuccessToast(processed, total), color: 'warning' };
};
