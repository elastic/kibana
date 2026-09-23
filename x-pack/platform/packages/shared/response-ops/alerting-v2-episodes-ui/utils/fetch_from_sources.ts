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

export interface FetchFromSourceResult<T> {
  results: T[];
  errors: EpisodeSourceError[];
}

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

const EMPTY_RESULT: FetchFromSourceResult<never> = { results: [], errors: [] };

export const fetchFromSource = async <T>(
  source: EpisodeDataSource | undefined,
  run: (source: EpisodeDataSource) => Promise<T> | undefined
): Promise<FetchFromSourceResult<T>> => {
  if (!source) return EMPTY_RESULT;

  const pending = run(source);
  if (!pending) return EMPTY_RESULT;

  try {
    return { results: [await pending], errors: [] };
  } catch (error) {
    return { results: [], errors: [{ sourceId: source.id, error: toError(error) }] };
  }
};
