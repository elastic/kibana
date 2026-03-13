/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

const DEFAULT_REPO_STORAGE_KEY = 'sr_default_repository';

export const useDefaultRepository = () => {
  const [defaultRepository, setDefaultRepositoryState] = useState<string | undefined>(() => {
    return localStorage.getItem(DEFAULT_REPO_STORAGE_KEY) || undefined;
  });

  const setDefaultRepository = (name: string) => {
    localStorage.setItem(DEFAULT_REPO_STORAGE_KEY, name);
    setDefaultRepositoryState(name);
  };

  return { defaultRepository, setDefaultRepository };
};
