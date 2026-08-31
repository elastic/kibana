/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeDataSource } from '../types/episode_data_source';

export interface EpisodeSourceError {
  sourceId: string;
  error: Error;
}

export interface FetchFromSourcesResult<T> {
  results: T[];
  errors: EpisodeSourceError[];
}

type SourceOutcome<T> =
  | { status: 'skipped' }
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; sourceId: string; error: Error };

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

export const fetchFromSources = async <T>(
  sources: readonly EpisodeDataSource[],
  run: (source: EpisodeDataSource) => Promise<T> | undefined
): Promise<FetchFromSourcesResult<T>> => {
  const settled = await Promise.all(
    sources.map(async (source): Promise<SourceOutcome<T>> => {
      const pending = run(source);
      if (!pending) {
        return { status: 'skipped' };
      }

      try {
        return { status: 'fulfilled', value: await pending };
      } catch (error) {
        return { status: 'rejected', sourceId: source.id, error: toError(error) };
      }
    })
  );

  const results: T[] = [];
  const errors: EpisodeSourceError[] = [];

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else if (outcome.status === 'rejected') {
      errors.push({ sourceId: outcome.sourceId, error: outcome.error });
    }
  }

  return { results, errors };
};
