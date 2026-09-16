/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_EPISODE_SOURCE_ID } from '../constants';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeDataSource } from '../types/episode_data_source';

export interface EpisodeSourceError {
  sourceId: string;
  error: Error;
}

export interface FetchFromSourceResult<T> {
  results: T[];
  errors: EpisodeSourceError[];
}

export const EMPTY_SOURCE_ERRORS: EpisodeSourceError[] = [];

const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

const EMPTY_RESULT: FetchFromSourceResult<never> = { results: [], errors: [] };

/**
 * Settles a fetch without throwing so a dual-source query can keep partial data.
 */
export const settleFetch = async <T>(
  sourceId: string,
  run: () => Promise<T>
): Promise<FetchFromSourceResult<T>> => {
  try {
    return { results: [await run()], errors: [] };
  } catch (error) {
    return { results: [], errors: [{ sourceId, error: toError(error) }] };
  }
};

export const fetchFromSource = async <T>(
  source: EpisodeDataSource | undefined,
  run: (source: EpisodeDataSource) => Promise<T> | undefined
): Promise<FetchFromSourceResult<T>> => {
  if (!source) return EMPTY_RESULT;

  const pending = run(source);
  if (!pending) return EMPTY_RESULT;

  return settleFetch(source.id, () => pending);
};

export interface FetchFromV2AndSourceResult<TV2, TSource> {
  v2: TV2 | undefined;
  additional: TSource[];
  errors: EpisodeSourceError[];
}

/**
 * Runs the v2 fetch and an optional additional source in parallel, settling both
 * so one failure does not drop the other source's data.
 */
export const fetchFromV2AndSource = async <TV2, TSource>({
  v2,
  source,
  fromSource,
}: {
  v2: () => Promise<TV2>;
  source: EpisodeDataSource | undefined;
  fromSource: (source: EpisodeDataSource) => Promise<TSource> | undefined;
}): Promise<FetchFromV2AndSourceResult<TV2, TSource>> => {
  const [v2Fetch, sourceFetch] = await Promise.all([
    settleFetch(ALERTING_V2_EPISODE_SOURCE_ID, v2),
    fetchFromSource(source, fromSource),
  ]);

  return {
    v2: v2Fetch.results[0],
    additional: sourceFetch.results,
    errors: [...v2Fetch.errors, ...sourceFetch.errors],
  };
};

export const fetchEpisodesFromSource = async (
  source: EpisodeDataSource | undefined,
  run: (source: EpisodeDataSource) => Promise<AlertEpisode[]> | undefined
): Promise<FetchFromSourceResult<AlertEpisode[]>> => {
  const result = await fetchFromSource(source, run);
  return {
    ...result,
    results: result.results.map((rows) => rows.map((ep) => ({ ...ep, source_id: source!.id }))),
  };
};
