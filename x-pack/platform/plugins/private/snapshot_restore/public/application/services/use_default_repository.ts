/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import {
  getDefaultRepository,
  setDefaultRepositoryApi,
  clearDefaultRepositoryApi,
} from './http/repository_requests';

export const useDefaultRepository = () => {
  const [defaultRepository, setDefaultRepositoryState] = useState<string | undefined>(undefined);

  useEffect(() => {
    getDefaultRepository().then(({ data }) => {
      setDefaultRepositoryState(data?.repositoryName ?? undefined);
    });
  }, []);

  const setDefaultRepository = async (name: string) => {
    await setDefaultRepositoryApi(name);
    setDefaultRepositoryState(name);
  };

  const clearDefaultRepository = async () => {
    await clearDefaultRepositoryApi();
    setDefaultRepositoryState(undefined);
  };

  return { defaultRepository, setDefaultRepository, clearDefaultRepository };
};
