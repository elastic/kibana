/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  getDefaultRepository as getDefaultRepositoryRequest,
  setDefaultRepository as setDefaultRepositoryRequest,
} from './http/repository_requests';

export type DefaultRepositoryStatus = 'loading' | 'loaded' | 'error';

export const useDefaultRepository = () => {
  const [defaultRepository, setDefaultRepositoryState] = useState<string | null>(null);
  const [defaultRepositoryStatus, setDefaultRepositoryStatus] =
    useState<DefaultRepositoryStatus>('loading');
  const [defaultRepositoryError, setDefaultRepositoryError] = useState<unknown | null>(null);

  const reloadDefaultRepository = useCallback(async () => {
    setDefaultRepositoryStatus('loading');
    setDefaultRepositoryError(null);
    const response = await getDefaultRepositoryRequest();
    const { data, error } = response;
    if (error) {
      setDefaultRepositoryStatus('error');
      setDefaultRepositoryError(error);
      return response;
    }
    setDefaultRepositoryState(data?.repositoryName ?? null);
    setDefaultRepositoryStatus('loaded');
    return response;
  }, []);

  useEffect(() => {
    void reloadDefaultRepository();
  }, [reloadDefaultRepository]);

  const setDefaultRepositoryName = useCallback(async (name: string) => {
    const response = await setDefaultRepositoryRequest(name);
    if (!response.error) {
      setDefaultRepositoryState(name);
      setDefaultRepositoryStatus('loaded');
      setDefaultRepositoryError(null);
    }
    return response;
  }, []);

  return {
    defaultRepository,
    isLoadingDefaultRepository: defaultRepositoryStatus === 'loading',
    defaultRepositoryStatus,
    defaultRepositoryError,
    reloadDefaultRepository,
    setDefaultRepository: setDefaultRepositoryName,
  };
};
