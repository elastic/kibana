/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';

interface UseSnapshotRepositoriesOptions {
  enabled?: boolean;
}

export const useSnapshotRepositories = ({
  enabled = true,
}: UseSnapshotRepositoriesOptions = {}) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const abortController = new AbortController();

    const fetchRepositories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await streamsRepositoryClient.fetch(
          'GET /internal/streams/lifecycle/_snapshot_repositories',
          { signal: abortController.signal }
        );
        const repoNames = response.repositories
          .map((repo) => repo.name)
          .sort((a, b) => a.localeCompare(b));
        setRepositories(repoNames);
      } catch (e) {
        if (abortController.signal.aborted) {
          return;
        }
        setError(e as Error);
        setRepositories([]);
      } finally {
        if (!abortController.signal.aborted) {
          setHasFetched(true);
          setIsLoading(false);
        }
      }
    };

    fetchRepositories();

    return () => {
      abortController.abort();
    };
  }, [enabled, streamsRepositoryClient, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  return {
    repositories,
    hasFetched,
    isLoading,
    error,
    refresh,
  };
};
