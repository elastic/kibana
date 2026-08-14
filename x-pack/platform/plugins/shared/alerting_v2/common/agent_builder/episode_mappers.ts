/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { resolveEpisodeLabel } from './resolve_episode_label';

export interface AlertEpisodeToAttachmentOptions {
  ruleName?: string;
  groupingFields?: readonly string[];
}

/** ES|QL returns `null` for missing columns; attachment storage uses `undefined`. */
const mapNullFieldsToUndefined = <T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], null> } => {
  const result = {} as { [K in keyof T]: Exclude<T[K], null> };
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    result[key] = (value === null ? undefined : value) as Exclude<T[keyof T], null>;
  }
  return result;
};

/**
 * Maps an {@link AlertEpisode} row to attachment `data`, converting any `null` field to `undefined`.
 */
export const alertEpisodeToEpisodeAttachment = (
  episode: AlertEpisode,
  options: AlertEpisodeToAttachmentOptions = {}
): EpisodeAttachmentData =>
  mapNullFieldsToUndefined({
    ...episode,
    'episode.label': resolveEpisodeLabel({
      episode,
      ruleName: options.ruleName,
      groupingFields: options.groupingFields,
    }),
  });
