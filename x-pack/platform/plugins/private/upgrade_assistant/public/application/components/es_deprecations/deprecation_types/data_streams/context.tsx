/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useReindexStatus, ReindexState } from './use_reindex_state';

export interface ReindexStateContext {
  reindexState: ReindexState;
  startReindex: () => Promise<void>;
  cancelReindex: () => Promise<void>;
}

const DataStreamReindexContext = createContext<ReindexStateContext | undefined>(undefined);

export const useDataStreamReindexContext = () => {
  const context = useContext(DataStreamReindexContext);
  if (context === undefined) {
    throw new Error('useDataStreamReindexContext must be used within a <ReindexStatusProvider />');
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  indexName: string;
}

export const ReindexStatusProvider: React.FunctionComponent<Props> = ({
  api,
  indexName,
  children,
}) => {
  const { reindexState, startReindex, cancelReindex } = useReindexStatus({
    indexName,
    api,
  });

  return (
    <DataStreamReindexContext.Provider
      value={{
        reindexState,
        startReindex,
        cancelReindex,
      }}
    >
      {children}
    </DataStreamReindexContext.Provider>
  );
};
