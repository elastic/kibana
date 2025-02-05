/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useReindexStatus, ReindexState } from './use_reindex_state';

export interface IndexStateContext {
  reindexState: ReindexState;
  startReindex: () => Promise<void>;
  cancelReindex: () => Promise<void>;
}

const IndexContext = createContext<IndexStateContext | undefined>(undefined);

export const useIndexContext = () => {
  const context = useContext(IndexContext);
  if (context === undefined) {
    throw new Error('useIndexContext must be used within a <IndexStatusProvider />');
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  indexName: string;
}

export const IndexStatusProvider: React.FunctionComponent<Props> = ({
  api,
  indexName,
  children,
}) => {
  const { reindexState, startReindex, cancelReindex } = useReindexStatus({
    indexName,
    api,
  });

  return (
    <IndexContext.Provider
      value={{
        reindexState,
        startReindex,
        cancelReindex,
      }}
    >
      {children}
    </IndexContext.Provider>
  );
};
