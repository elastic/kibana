/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import type { SuggestionTimeRange } from './job_suggestion_service';

const STORAGE_KEY_PREFIX = 'ml.suggestedJobs.lastRuns';
// Bounds what is kept in the browser. The least recently run index patterns are forgotten first.
const MAX_STORED_INDEX_PATTERNS = 20;

/** The suggestions of one completed run, with when and over what time range it was made. */
export interface SuggestionRun {
  timeRange: SuggestionTimeRange;
  ranAt: number;
  suggestions: JobSuggestion[];
}

/** The last run for each index pattern. */
type StoredRuns = Record<string, SuggestionRun>;

// What is saved comes from the user's data, so it is kept for each user rather than for the browser.
const getStorageKey = (username: string): string => `${STORAGE_KEY_PREFIX}.${username}`;

const isSuggestion = (value: unknown): value is JobSuggestion => {
  const suggestion = value as Partial<JobSuggestion> | null;
  return (
    typeof suggestion === 'object' &&
    suggestion !== null &&
    typeof suggestion.id === 'string' &&
    typeof suggestion.title === 'string' &&
    typeof suggestion.description === 'string' &&
    typeof suggestion.jobType === 'string' &&
    typeof suggestion.job === 'object' &&
    suggestion.job !== null &&
    typeof suggestion.datafeed === 'object' &&
    suggestion.datafeed !== null
  );
};

const isRun = (value: unknown): value is SuggestionRun => {
  const run = value as Partial<SuggestionRun> | null;
  return (
    typeof run === 'object' &&
    run !== null &&
    typeof run.ranAt === 'number' &&
    typeof run.timeRange?.from === 'string' &&
    typeof run.timeRange?.to === 'string' &&
    Array.isArray(run.suggestions) &&
    run.suggestions.length > 0 &&
    run.suggestions.every(isSuggestion)
  );
};

const readRuns = (storage: Storage, username: string): StoredRuns => {
  try {
    const stored = storage.get(getStorageKey(username));
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter((entry): entry is [string, SuggestionRun] => isRun(entry[1]))
    );
  } catch (error) {
    return {};
  }
};

/** The last run which was made for an index pattern, whatever its time range. */
export const getPreviousRun = (
  storage: Storage,
  username: string,
  indexPattern: string
): SuggestionRun | undefined => readRuns(storage, username)[indexPattern];

/** Remembers a run as the last one for its index pattern, in place of the one before. */
export const saveRun = (
  storage: Storage,
  username: string,
  indexPattern: string,
  run: SuggestionRun
): void => {
  const { [indexPattern]: _replaced, ...others } = readRuns(storage, username);
  const kept = Object.entries({ ...others, [indexPattern]: run })
    .sort(([, a], [, b]) => b.ranAt - a.ranAt)
    .slice(0, MAX_STORED_INDEX_PATTERNS);

  try {
    storage.set(getStorageKey(username), Object.fromEntries(kept));
  } catch (error) {
    // The results are a convenience. Not being able to keep them, for example when the browser's
    // storage is full or turned off, must not get in the way.
  }
};
