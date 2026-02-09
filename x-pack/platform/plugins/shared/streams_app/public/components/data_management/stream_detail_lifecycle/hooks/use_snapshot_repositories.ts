/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';

interface Repository {
  name: string;
  type: string;
}

interface RepositoriesResponse {
  repositories?: Repository[];
}

/**
 * Hook to fetch snapshot repositories from the snapshot_restore API
 */
export const useSnapshotRepositories = () => {
  const {
    core: { http },
  } = useKibana();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Refactor this to use a internal route instead of the snapshot_restore plugin route
        const response = await http.get<RepositoriesResponse>('/api/snapshot_restore/repositories');
        const repoNames = response.repositories?.map((repo) => repo.name) ?? [];
        setRepositories(repoNames);
      } catch (e) {
        /*
         * If the API fails (e.g., user doesn't have permissions or plugin not available),
         * set empty array
         */
        setError(e as Error);
        setRepositories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, [http, refreshCounter]);

  const refresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
  }, []);

  return {
    repositories,
    isLoading,
    error,
    refresh,
  };
};
