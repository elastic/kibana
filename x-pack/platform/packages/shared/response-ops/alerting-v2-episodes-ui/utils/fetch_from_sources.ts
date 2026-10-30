/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  sourceFilterIncludesV2,
} from '@kbn/alerting-v2-common-queries';
import { CLASSIC_EPISODE_SOURCE_ID } from '../classic_alerts/constants';
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

interface ErrorLikeValue {
  name?: unknown;
  message?: unknown;
}

// Expression (ES|QL) failures reject with a plain `ErrorLike` object; keeping it as the
// cause preserves `original.attributes` for `shouldSwallowFetchError`.
const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  if (value == null || typeof value !== 'object') {
    return new Error(String(value));
  }
  const { name, message } = value as ErrorLikeValue;
  const error = new Error(typeof message === 'string' ? message : String(value), {
    cause: value,
  });
  if (typeof name === 'string') {
    error.name = name;
  }
  return error;
};

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
 * so one failure does not drop the other source's data. The v2 fetch is skipped
 * when `queryV2Source` is false.
 */
export const fetchFromV2AndSource = async <TV2, TSource>({
  v2,
  source,
  fromSource,
  queryV2Source = true,
}: {
  v2: () => Promise<TV2>;
  source: EpisodeDataSource | undefined;
  fromSource: (source: EpisodeDataSource) => Promise<TSource> | undefined;
  queryV2Source?: boolean;
}): Promise<FetchFromV2AndSourceResult<TV2, TSource>> => {
  const [v2Fetch, sourceFetch] = await Promise.all([
    queryV2Source ? settleFetch(ALERTING_V2_EPISODE_SOURCE_ID, v2) : EMPTY_RESULT,
    fetchFromSource(source, fromSource),
  ]);

  return {
    v2: v2Fetch.results[0],
    additional: sourceFetch.results,
    errors: [...v2Fetch.errors, ...sourceFetch.errors],
  };
};

/**
 * Filter value for an additional source. Classic rows are selected with the
 * namespaced filter id, so a connector slug `v1` does not select them.
 */
const filterValueForAdditionalSource = (sourceId: string): string =>
  sourceId === CLASSIC_EPISODE_SOURCE_ID ? EPISODE_SOURCE_FILTER_CLASSIC : sourceId;

/**
 * Decides which pipelines a source selection can match, so a selection that
 * cannot match a pipeline does not query it.
 */
export const resolveEpisodeSourceQueries = ({
  sources,
  queryV2Source,
  additionalSource,
}: {
  sources?: readonly string[] | null;
  queryV2Source: boolean;
  additionalSource: EpisodeDataSource | undefined;
}): {
  queryV2Source: boolean;
  additionalSource: EpisodeDataSource | undefined;
} => {
  const includeAdditional =
    additionalSource != null &&
    (!sources?.length || sources.includes(filterValueForAdditionalSource(additionalSource.id)));
  return {
    queryV2Source: queryV2Source && sourceFilterIncludesV2(sources),
    additionalSource: includeAdditional ? additionalSource : undefined,
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
