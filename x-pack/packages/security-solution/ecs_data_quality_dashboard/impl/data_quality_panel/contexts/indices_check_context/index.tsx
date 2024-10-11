/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';

import { UseIndicesCheckReturnValue } from '../../hooks/use_indices_check/types';

export const IndicesCheckContext = createContext<UseIndicesCheckReturnValue | null>(null);

export const useIndicesCheckContext = () => {
  const context = useContext(IndicesCheckContext);
  if (context == null) {
    throw new Error('useIndicesCheckContext must be used inside the IndicesCheckContextProvider.');
  }
  return context;
};
