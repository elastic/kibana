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

export const useDefaultRepository = () => {
  const [defaultRepository, setDefaultRepositoryState] = useState<string | undefined>(undefined);
  const [isLoadingDefaultRepository, setIsLoadingDefaultRepository] = useState<boolean>(true);

  const reloadDefaultRepository = useCallback(async () => {
    setIsLoadingDefaultRepository(true);
    const response = await getDefaultRepositoryRequest();
    const { data, error } = response;
    if (!error) {
      setDefaultRepositoryState(data?.repositoryName ?? undefined);
    }
    setIsLoadingDefaultRepository(false);
    return response;
  }, []);

  useEffect(() => {
    void reloadDefaultRepository();
  }, [reloadDefaultRepository]);

  const setDefaultRepositoryName = useCallback(async (name: string) => {
    const response = await setDefaultRepositoryRequest(name);
    if (!response.error) {
      setDefaultRepositoryState(name);
    }
    return response;
  }, []);

  return {
    defaultRepository,
    isLoadingDefaultRepository,
    reloadDefaultRepository,
    setDefaultRepository: setDefaultRepositoryName,
  };
};
