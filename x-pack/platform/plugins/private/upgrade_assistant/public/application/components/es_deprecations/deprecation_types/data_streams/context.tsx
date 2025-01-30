/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ApiService } from '../../../../lib/api';
import { useReindexStatus, ReindexState, DeprecationMetadata } from './use_reindex_state';

export interface ReindexStateContext {
  reindexState: ReindexState;
  startReindex: () => Promise<void>;
  loadDataStreamMetadata: () => Promise<void>;
  cancelReindex: () => Promise<void>;
}

const DataStreamReindexContext = createContext<ReindexStateContext | undefined>(undefined);

export const useDataStreamReindexContext = () => {
  const context = useContext(DataStreamReindexContext);
  if (context === undefined) {
    throw new Error(
      'useDataStreamReindexContext must be used within a <DataStreamReindexStatusProvider />'
    );
  }
  return context;
};

interface Props {
  api: ApiService;
  children: React.ReactNode;
  deprecationMetadata: DeprecationMetadata;
  indexName: string;
  learnMoreUrl: string;
}

export const DataStreamReindexStatusProvider: React.FunctionComponent<Props> = ({
  api,
  indexName,
  deprecationMetadata,
  children,
  learnMoreUrl,
}) => {
  const { reindexState, startReindex, loadDataStreamMetadata, cancelReindex } = useReindexStatus({
    dataStreamName: indexName,
    deprecationMetadata,
    learnMoreUrl,
    api,
  });

  return (
    <DataStreamReindexContext.Provider
      value={{
        reindexState,
        startReindex,
        cancelReindex,
        loadDataStreamMetadata,
      }}
    >
      {children}
    </DataStreamReindexContext.Provider>
  );
};
