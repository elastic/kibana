/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useMlKibana } from '../../contexts/kibana';
import { clearRun, getPreviousRun, saveRun } from './previous_runs';
import type { SuggestionRun } from './previous_runs';
import type { SuggestionsState } from './job_suggestion_service';

// Used when there is no security, and so no user.
const ANONYMOUS_USERNAME = 'anonymous';

const useUsername = (): string | undefined => {
  const {
    services: { security },
  } = useMlKibana();
  const [username, setUsername] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const currentUser = security?.authc.getCurrentUser() ?? Promise.resolve(undefined);
    currentUser
      .then((user) => user?.username ?? ANONYMOUS_USERNAME)
      .catch(() => ANONYMOUS_USERNAME)
      .then((name) => !cancelled && setUsername(name));
    return () => {
      cancelled = true;
    };
  }, [security]);

  return username;
};

export interface SuggestionHistory {
  /** The run which was remembered when the flyout was opened. */
  previousRun: SuggestionRun | undefined;
  /** Whether what was remembered has been read, so that no previous run means there is none. */
  isLoaded: boolean;
  /** Forgets the previous run. */
  clearPreviousRun: () => void;
}

/**
 * Remembers the last completed run for the index pattern, and returns the run which was
 * remembered when the flyout was opened. That run is kept for as long as the flyout is open,
 * while the runs made in the meantime are remembered in its place.
 */
export const useSuggestionHistory = (
  indexPattern: string,
  state: SuggestionsState
): SuggestionHistory => {
  const storage = useMemo(() => new Storage(window.localStorage), []);
  const username = useUsername();
  const [previousRun, setPreviousRun] = useState<SuggestionRun>();
  const [loadedIndexPattern, setLoadedIndexPattern] = useState<string>();

  const latestRun = useMemo<SuggestionRun | undefined>(
    () =>
      state.status === 'loaded' && state.suggestions.length > 0
        ? { timeRange: state.timeRange, ranAt: state.ranAt, suggestions: state.suggestions }
        : undefined,
    [state]
  );

  // Read before the effect below saves anything.
  useEffect(() => {
    if (username === undefined) return;
    setPreviousRun(getPreviousRun(storage, username, indexPattern));
    setLoadedIndexPattern(indexPattern);
  }, [storage, username, indexPattern]);

  useEffect(() => {
    if (username === undefined || latestRun === undefined) return;
    saveRun(storage, username, indexPattern, latestRun);
  }, [storage, username, indexPattern, latestRun]);

  const clearPreviousRun = useCallback(() => {
    if (username === undefined || previousRun === undefined) return;
    // A run which was made since the flyout was opened has taken its place, and is kept as the previous run for next time.
    if (getPreviousRun(storage, username, indexPattern)?.ranAt === previousRun.ranAt) {
      clearRun(storage, username, indexPattern);
    }
    setPreviousRun(undefined);
  }, [storage, username, indexPattern, previousRun]);

  return { previousRun, isLoaded: loadedIndexPattern === indexPattern, clearPreviousRun };
};
